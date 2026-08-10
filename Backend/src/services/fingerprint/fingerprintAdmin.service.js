import mongoose from "mongoose";
import AudioFingerprint from "../../models/AudioFingerprint.js";
import AudioFingerprintMatch from "../../models/AudioFingerprintMatch.js";
import CopyrightClaim from "../../models/CopyrightClaim.js";
import CopyrightRegistry from "../../models/CopyrightRegistry.js";
import Track from "../../models/Track.js";
import { AppError } from "../../utils/AppError.js";
import { reprocessTrackAudioFingerprint } from "./audioFingerprint.job.js";
import { getFingerprintEngineStatus } from "./audioFingerprint.service.js";

const ensureObjectId = (value, field) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new AppError(`${field} is invalid.`, 400, { field });
    }
};

const trackPopulate = [
    { path: "artist_artistId", select: "_id name userId activeStatus isDeleted" },
];

const listFingerprintMatches = async (query = {}) => {
    const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.severity) filter.severity = query.severity;
    if (query.riskLevel) filter.riskLevel = query.riskLevel;
    if (query.sourceTrackId) {
        ensureObjectId(query.sourceTrackId, "sourceTrackId");
        filter.sourceTrackId = query.sourceTrackId;
    }
    if (query.matchedTrackId) {
        ensureObjectId(query.matchedTrackId, "matchedTrackId");
        filter.matchedTrackId = query.matchedTrackId;
    }
    if (query.artistId) {
        ensureObjectId(query.artistId, "artistId");
        const artistTrackIds = await Track.find({ artist_artistId: query.artistId }).distinct("_id");
        filter.$or = [
            { sourceTrackId: { $in: artistTrackIds } },
            { matchedTrackId: { $in: artistTrackIds } },
        ];
    }
    if (query.from || query.to) {
        filter.createdAt = {};
        if (query.from) filter.createdAt.$gte = new Date(query.from);
        if (query.to) filter.createdAt.$lt = new Date(query.to);
    }

    const [matches, total] = await Promise.all([
        AudioFingerprintMatch.find(filter)
            .sort({ createdAt: -1, _id: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            // Keep reference ids available for populate, but never expose raw
            // fingerprint arrays from this review list.
            .select("-__v")
            .populate({ path: "sourceTrackId", select: "title versionTitle duration activeStatus approvalStatus isDeleted artist_artistId", populate: trackPopulate })
            .populate({ path: "matchedTrackId", select: "title versionTitle duration activeStatus approvalStatus isDeleted artist_artistId", populate: trackPopulate })
            .lean(),
        AudioFingerprintMatch.countDocuments(filter),
    ]);

    return {
        matches,
        pagination: { page, limit, total, totalPages: total === 0 ? 0 : Math.ceil(total / limit) },
    };
};

const getFingerprintMatchDetail = async (matchId) => {
    ensureObjectId(matchId, "matchId");
    const match = await AudioFingerprintMatch.findById(matchId)
        .populate({ path: "sourceTrackId", select: "title versionTitle duration activeStatus approvalStatus isDeleted copyright artist_artistId", populate: trackPopulate })
        .populate({ path: "matchedTrackId", select: "title versionTitle duration activeStatus approvalStatus isDeleted copyright artist_artistId", populate: trackPopulate })
        .populate("reviewedBy", "email role profile.fullName")
        .populate("disputeClaimId", "status claimType statement createdAt")
        .lean();
    if (!match) throw new AppError("Fingerprint match not found.", 404);

    const trackIds = [match.sourceTrackId?._id, match.matchedTrackId?._id].filter(Boolean);
    const registries = await CopyrightRegistry.find({ trackId: { $in: trackIds } })
        .select("trackId rightsOwner source verificationStatus recording musicalWork externalVerification notes updatedAt")
        .lean();
    const registryByTrack = new Map(registries.map((registry) => [String(registry.trackId), registry]));

    return {
        ...match,
        copyrightRegistry: {
            source: registryByTrack.get(String(match.sourceTrackId?._id)) || null,
            matched: registryByTrack.get(String(match.matchedTrackId?._id)) || null,
        },
    };
};

const reviewFingerprintMatch = async (adminUserId, matchId, payload = {}) => {
    ensureObjectId(adminUserId, "adminUserId");
    ensureObjectId(matchId, "matchId");
    const decision = String(payload.decision || "").trim();
    if (!["dismiss", "confirm", "request_evidence", "open_dispute", "link_recording"].includes(decision)) {
        throw new AppError("Invalid fingerprint match decision.", 400, { field: "decision" });
    }

    const match = await AudioFingerprintMatch.findById(matchId);
    if (!match) throw new AppError("Fingerprint match not found.", 404);

    let disputeClaimId = match.disputeClaimId || null;
    if (["open_dispute", "request_evidence"].includes(decision) && !disputeClaimId) {
        const [sourceTrack, matchedTrack] = await Promise.all([
            Track.findById(match.sourceTrackId).populate("artist_artistId", "_id userId").lean(),
            Track.findById(match.matchedTrackId).populate("artist_artistId", "_id userId").lean(),
        ]);
        const respondentUserId = sourceTrack?.artist_artistId?.userId || matchedTrack?.artist_artistId?.userId;
        if (!respondentUserId) throw new AppError("Could not resolve the track owner for this dispute.", 409);

        const claim = await CopyrightClaim.create({
            trackId: sourceTrack?._id || match.sourceTrackId,
            claimantUserId: adminUserId,
            respondentUserId,
            respondentArtistId: sourceTrack?.artist_artistId?._id || matchedTrack?.artist_artistId?._id,
            claimType: "ownership",
            statement: `Admin opened a copyright review from fingerprint match ${match._id}. ${String(payload.note || "").trim()}`.trim(),
            requestedAction: "review",
            status: "under_review",
        });
        disputeClaimId = claim._id;
    }

    if (decision === "link_recording") {
        const recordingId = String(payload.recordingId || "").trim();
        if (!recordingId) throw new AppError("recordingId is required when linking a recording.", 400, { field: "recordingId" });

        const [sourceTrack, matchedTrack] = await Promise.all([
            Track.findById(match.sourceTrackId).select("title copyright").lean(),
            Track.findById(match.matchedTrackId).select("title copyright").lean(),
        ]);
        if (!sourceTrack || !matchedTrack) throw new AppError("Could not resolve both tracks for recording linking.", 409);

        await Promise.all([sourceTrack, matchedTrack].map((track) => CopyrightRegistry.findOneAndUpdate(
            { trackId: track._id },
            {
                $set: {
                    "recording.recordingId": recordingId,
                    "recording.title": track.title || "",
                    "recording.owner": track.copyright?.recordingOwner || "",
                    "recording.isrc": track.copyright?.isrc || "",
                },
                $setOnInsert: { trackId: track._id },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        )));
    }

    const nextStatus = decision === "dismiss" ? "dismissed" : decision === "confirm" ? "confirmed" : "under_review";
    match.status = nextStatus;
    match.reviewedBy = adminUserId;
    match.reviewedAt = new Date();
    match.reviewDecision = decision;
    match.reviewNote = String(payload.note || "").trim().slice(0, 5000);
    match.disputeClaimId = disputeClaimId;
    await match.save();
    return getFingerprintMatchDetail(match._id);
};

const reprocessFingerprint = async (trackId) => {
    ensureObjectId(trackId, "trackId");
    return reprocessTrackAudioFingerprint(trackId);
};

const getFingerprintMetrics = async () => {
    const [byStatus, bySeverity, byRisk, engine] = await Promise.all([
        AudioFingerprint.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        AudioFingerprintMatch.aggregate([{ $group: { _id: "$severity", count: { $sum: 1 } } }]),
        AudioFingerprintMatch.aggregate([{ $group: { _id: "$riskLevel", count: { $sum: 1 } } }]),
        getFingerprintEngineStatus(),
    ]);
    return { engine, fingerprints: byStatus, matchesBySeverity: bySeverity, matchesByRisk: byRisk };
};

export default {
    listFingerprintMatches,
    getFingerprintMatchDetail,
    reviewFingerprintMatch,
    reprocessFingerprint,
    getFingerprintMetrics,
};
