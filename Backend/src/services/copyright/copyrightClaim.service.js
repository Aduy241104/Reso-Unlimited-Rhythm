import crypto from "node:crypto";
import mongoose from "mongoose";
import CopyrightClaim from "../../models/CopyrightClaim.js";
import CopyrightRegistry from "../../models/CopyrightRegistry.js";
import Track from "../../models/Track.js";
import Artist from "../../models/Artist.js";
import User from "../../models/User.js";
import { uploadEvidenceBuffer } from "../cloudinaryService.js";
import { AppError } from "../../utils/AppError.js";
import { recordAuditEvent } from "../audit/auditLog.service.js";

const OPEN_STATUSES = ["submitted", "under_review", "responded", "appealed"];
const MAX_EVIDENCE_FILES = 5;
const MAX_EVIDENCE_SIZE = 25 * 1024 * 1024;

const ensureObjectId = (value, field) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new AppError(`${field} is invalid.`, 400, { field });
    }
};

const normalizeText = (value, max = 5000) =>
    typeof value === "string" ? value.trim().slice(0, max) : "";

const serializeEvidence = (evidence = []) => evidence.map((item) => ({
    sha256: item.sha256,
    originalName: item.originalName,
    mimeType: item.mimeType,
    size: item.size,
    storageUrl: item.storageUrl,
    uploadedAt: item.uploadedAt,
}));

const sanitizeClaim = (claim) => {
    if (!claim) return null;
    const value = claim.toObject ? claim.toObject() : claim;

    return {
        ...value,
        evidence: serializeEvidence(value.evidence),
        response: value.response
            ? { ...value.response, evidence: serializeEvidence(value.response.evidence) }
            : null,
        appeal: value.appeal
            ? { ...value.appeal, evidence: serializeEvidence(value.appeal.evidence) }
            : null,
    };
};

const uploadEvidence = async (files = [], ownerId, purpose) => {
    if (!Array.isArray(files) || files.length === 0) return [];

    if (files.length > MAX_EVIDENCE_FILES) {
        throw new AppError(`At most ${MAX_EVIDENCE_FILES} evidence files are allowed.`, 400, {
            field: "evidence",
        });
    }

    const seenHashes = new Set();
    const result = [];

    for (const [index, file] of files.entries()) {
        if (!file?.buffer || file.size > MAX_EVIDENCE_SIZE) {
            throw new AppError("Each evidence file must be smaller than 25 MB.", 400, {
                field: "evidence",
            });
        }

        const sha256 = crypto.createHash("sha256").update(file.buffer).digest("hex");
        if (seenHashes.has(sha256)) {
            throw new AppError("Duplicate evidence files are not allowed.", 409, {
                field: "evidence",
            });
        }
        seenHashes.add(sha256);

        try {
            const uploaded = await uploadEvidenceBuffer({
                buffer: file.buffer,
                folder: `reso/copyright/${purpose}`,
                publicId: `${ownerId}_${Date.now()}_${index}_${sha256.slice(0, 12)}`,
            });

            result.push({
                sha256,
                originalName: normalizeText(file.originalname, 255),
                mimeType: normalizeText(file.mimetype, 120),
                size: file.size,
                storageUrl: uploaded.secure_url || uploaded.url || "",
                publicId: uploaded.public_id || "",
                uploadedAt: new Date(),
            });
        } catch {
            throw new AppError("Could not upload copyright evidence.", 502, {
                field: "evidence",
            });
        }
    }

    return result;
};

const getTrackAndRightsOwner = async (trackId) => {
    ensureObjectId(trackId, "trackId");
    const track = await Track.findOne({
        _id: trackId,
        isDeleted: { $ne: true },
    }).populate({
        path: "artist_artistId",
        select: "_id userId name isDeleted activeStatus",
    });

    if (!track || !track.artist_artistId || track.artist_artistId.isDeleted === true) {
        throw new AppError("Track not found.", 404);
    }

    return track;
};

const createClaim = async (claimantUserId, payload = {}, files = []) => {
    ensureObjectId(claimantUserId, "userId");
    const track = await getTrackAndRightsOwner(payload.trackId);

    if (String(track.artist_artistId.userId) === String(claimantUserId)) {
        throw new AppError("You cannot claim your own track.", 409);
    }

    const existing = await CopyrightClaim.findOne({
        trackId: track._id,
        claimantUserId,
        status: { $in: OPEN_STATUSES },
    }).select("_id status").lean();

    if (existing) {
        throw new AppError("You already have an open claim for this track.", 409);
    }

    const statement = normalizeText(payload.statement);
    if (statement.length < 20) {
        throw new AppError("A copyright claim statement must contain at least 20 characters.", 400, {
            field: "statement",
        });
    }

    const claimType = ["ownership", "license", "metadata", "other"].includes(payload.claimType)
        ? payload.claimType
        : "ownership";
    const requestedAction = ["remove_content", "credit_update", "review"].includes(payload.requestedAction)
        ? payload.requestedAction
        : "review";
    const [claimant, claimantArtist] = await Promise.all([
        User.findById(claimantUserId).select("email profile.fullName role").lean(),
        Artist.findOne({ userId: claimantUserId, isDeleted: { $ne: true } }).select("_id").lean(),
    ]);

    if (!claimant) throw new AppError("User not found.", 404);

    const evidence = await uploadEvidence(files, claimantUserId, "claims");
    const claim = await CopyrightClaim.create({
        trackId: track._id,
        claimantUserId,
        claimantArtistId: claimantArtist?._id,
        respondentUserId: track.artist_artistId.userId,
        respondentArtistId: track.artist_artistId._id,
        claimType,
        statement,
        requestedAction,
        evidence,
        status: "submitted",
    });

    return sanitizeClaim(claim);
};

const findClaimForParticipant = async (claimId, userId) => {
    ensureObjectId(claimId, "claimId");
    ensureObjectId(userId, "userId");
    const claim = await CopyrightClaim.findOne({
        _id: claimId,
        $or: [{ claimantUserId: userId }, { respondentUserId: userId }],
    });
    if (!claim) throw new AppError("Copyright claim not found.", 404);
    return claim;
};

const respondToClaim = async (userId, claimId, payload = {}, files = []) => {
    const claim = await findClaimForParticipant(claimId, userId);
    if (String(claim.respondentUserId) !== String(userId)) {
        throw new AppError("Only the rights holder can respond to this claim.", 403);
    }
    if (!OPEN_STATUSES.includes(claim.status)) {
        throw new AppError("This claim is no longer accepting a response.", 409);
    }

    const statement = normalizeText(payload.statement);
    if (statement.length < 20) {
        throw new AppError("A response must contain at least 20 characters.", 400, {
            field: "statement",
        });
    }

    claim.response = {
        statement,
        evidence: await uploadEvidence(files, userId, "responses"),
        respondedBy: userId,
        respondedAt: new Date(),
    };
    claim.status = "responded";
    await claim.save();
    return sanitizeClaim(claim);
};

const appealClaim = async (userId, claimId, payload = {}, files = []) => {
    const claim = await findClaimForParticipant(claimId, userId);
    if (!["resolved", "rejected"].includes(claim.status)) {
        throw new AppError("A claim can only be appealed after a decision.", 409);
    }

    const statement = normalizeText(payload.statement);
    if (statement.length < 20) {
        throw new AppError("An appeal must contain at least 20 characters.", 400, {
            field: "statement",
        });
    }

    claim.appeal = {
        statement,
        evidence: await uploadEvidence(files, userId, "appeals"),
        submittedBy: userId,
        submittedAt: new Date(),
    };
    claim.status = "appealed";
    await claim.save();
    return sanitizeClaim(claim);
};

const getMyClaims = async (userId, query = {}) => {
    ensureObjectId(userId, "userId");
    const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || 20));
    const filter = { $or: [{ claimantUserId: userId }, { respondentUserId: userId }] };
    if (query.status) filter.status = query.status;

    const [claims, total] = await Promise.all([
        CopyrightClaim.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        CopyrightClaim.countDocuments(filter),
    ]);

    return {
        claims: claims.map(sanitizeClaim),
        pagination: { page, limit, total, totalPages: total === 0 ? 0 : Math.ceil(total / limit) },
    };
};

const getClaimForParticipant = async (userId, claimId) =>
    sanitizeClaim(await findClaimForParticipant(claimId, userId));

const listClaimsForAdmin = async (query = {}) => {
    const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
    const filter = query.status ? { status: query.status } : {};
    const [claims, total] = await Promise.all([
        CopyrightClaim.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        CopyrightClaim.countDocuments(filter),
    ]);
    return {
        claims: claims.map(sanitizeClaim),
        pagination: { page, limit, total, totalPages: total === 0 ? 0 : Math.ceil(total / limit) },
    };
};

const decideClaim = async (adminUserId, claimId, payload = {}) => {
    ensureObjectId(adminUserId, "adminUserId");
    ensureObjectId(claimId, "claimId");
    const outcome = payload.outcome;
    if (!["remove_content", "keep_content", "credit_update", "no_action"].includes(outcome)) {
        throw new AppError("Invalid copyright claim outcome.", 400, { field: "outcome" });
    }

    const claim = await CopyrightClaim.findById(claimId);
    if (!claim) throw new AppError("Copyright claim not found.", 404);
    if (["withdrawn"].includes(claim.status)) {
        throw new AppError("This claim cannot be decided.", 409);
    }

    const track = await Track.findOne({ _id: claim.trackId, isDeleted: { $ne: true } });
    if (!track) throw new AppError("Claimed track no longer exists.", 404);

    if (outcome === "remove_content") {
        track.activeStatus = "hidden";
        track.hiddenReason = normalizeText(payload.note, 2000) || "Hidden after copyright claim review.";
        track.hiddenAt = new Date();
        if (track.copyright) track.copyright.copyrightStatus = "disputed";
    } else if (outcome === "keep_content" || outcome === "credit_update") {
        if (track.copyright) track.copyright.copyrightStatus = "verified";
    } else if (track.copyright) {
        track.copyright.copyrightStatus = "pending";
    }

    await track.save();
    await CopyrightRegistry.findOneAndUpdate(
        { trackId: track._id },
        {
            $set: {
                rightsOwner: track.copyright?.copyrightOwner || "",
                verificationStatus: outcome === "remove_content"
                    ? "disputed"
                    : outcome === "no_action"
                        ? "pending"
                        : "verified",
                source: "claim_decision",
                updatedBy: adminUserId,
                notes: normalizeText(payload.note, 5000),
            },
            $setOnInsert: { trackId: track._id },
        },
        { upsert: true, new: true }
    );
    claim.status = outcome === "no_action" ? "rejected" : "resolved";
    claim.decision = {
        outcome,
        note: normalizeText(payload.note, 5000),
        decidedBy: adminUserId,
        decidedAt: new Date(),
    };
    await claim.save();
    void recordAuditEvent({
        actorUserId: adminUserId,
        action: "admin.copyright_claim.decide",
        targetType: "copyright_claim",
        targetId: claim._id,
        metadata: { outcome, trackId: claim.trackId },
    }).catch(() => null);
    return sanitizeClaim(claim);
};

export default {
    createClaim,
    respondToClaim,
    appealClaim,
    getMyClaims,
    getClaimForParticipant,
    listClaimsForAdmin,
    decideClaim,
};
