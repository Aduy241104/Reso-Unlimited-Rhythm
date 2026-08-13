import crypto from "node:crypto";
import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import Track from "../../models/Track.js";
import Artist from "../../models/Artist.js";
import User from "../../models/User.js";
import TrackReviewAppeal from "../../models/TrackReviewAppeal.js";
import { AppError } from "../../utils/AppError.js";
import { recordAuditEvent } from "../audit/auditLog.service.js";
import {
    COPYRIGHT_EVIDENCE_TYPES,
    MAX_EVIDENCE_DOCUMENTS,
    MAX_EVIDENCE_SIZE,
    isHttpUrl,
    validateEvidenceUploadFile,
} from "../Track/copyright.validation.service.js";
import { uploadEvidenceBuffer } from "../cloudinaryService.js";
import {
    getCurrentTrackRejectionState,
    getTrackRejectionSnapshot,
    isSameRejectionSnapshot,
} from "./track.rejection.js";

const MESSAGE_MAX_LENGTH = 5000;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const assertObjectId = (value, field = "id") => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new AppError("Mã tài nguyên không hợp lệ.", StatusCodes.BAD_REQUEST, { field });
    }
};

const getArtistForUser = async (userId) => {
    const user = await User.findById(userId).select("_id role email").lean();
    if (!user) throw new AppError("Không tìm thấy người dùng.", StatusCodes.NOT_FOUND);
    if (user.role !== "artist") throw new AppError("Chỉ nghệ sĩ mới có thể gửi phản hồi quyết định.", StatusCodes.FORBIDDEN);

    const artist = await Artist.findOne({ userId }).select("_id userId name").lean();
    if (!artist) throw new AppError("Không tìm thấy hồ sơ nghệ sĩ.", StatusCodes.NOT_FOUND);
    return { user, artist };
};

const getArtistTrack = async (userId, trackId) => {
    assertObjectId(trackId);
    const { user, artist } = await getArtistForUser(userId);
    const track = await Track.findOne({
        _id: trackId,
        artist_artistId: artist._id,
        isDeleted: { $ne: true },
    });

    if (!track) {
        throw new AppError("Không tìm thấy bài hát hoặc bạn không có quyền truy cập.", StatusCodes.NOT_FOUND);
    }
    return { user, artist, track };
};

const normalizeMessage = (message) => {
    const normalized = typeof message === "string" ? message.trim() : "";
    if (normalized.length < 10) {
        throw new AppError("Nội dung phản hồi phải có ít nhất 10 ký tự.", StatusCodes.UNPROCESSABLE_ENTITY, { field: "message" });
    }
    if (normalized.length > MESSAGE_MAX_LENGTH) {
        throw new AppError("Nội dung phản hồi không được vượt quá 5000 ký tự.", StatusCodes.UNPROCESSABLE_ENTITY, { field: "message" });
    }
    return normalized;
};

const normalizeEvidenceDocuments = (documents = []) => {
    if (!Array.isArray(documents)) {
        throw new AppError("Danh sách bằng chứng không hợp lệ.", StatusCodes.UNPROCESSABLE_ENTITY, { field: "evidenceDocuments" });
    }
    if (documents.length > MAX_EVIDENCE_DOCUMENTS) {
        throw new AppError(`Chỉ được gửi tối đa ${MAX_EVIDENCE_DOCUMENTS} tài liệu bằng chứng.`, StatusCodes.UNPROCESSABLE_ENTITY, { field: "evidenceDocuments" });
    }

    return documents.map((document, index) => {
        const source = document && typeof document === "object" ? document : {};
        const url = String(source.url || source.storageUrl || "").trim();
        const size = Number(source.size || 0);
        const mimeType = String(source.mimeType || "").trim().toLowerCase();
        if (!isHttpUrl(url)) {
            throw new AppError("URL bằng chứng phải dùng http hoặc https.", StatusCodes.UNPROCESSABLE_ENTITY, { field: `evidenceDocuments.${index}.url` });
        }
        if (!Number.isFinite(size) || size <= 0 || size > MAX_EVIDENCE_SIZE) {
            throw new AppError("Kích thước tài liệu bằng chứng không hợp lệ.", StatusCodes.UNPROCESSABLE_ENTITY, { field: `evidenceDocuments.${index}.size` });
        }
        if (!mimeType || (!mimeType.startsWith("image/") && ![
            "application/pdf", "application/zip", "application/octet-stream",
            "audio/mpeg", "audio/wav", "audio/x-wav", "audio/flac", "audio/mp4",
        ].includes(mimeType))) {
            throw new AppError("Loại tệp bằng chứng không được hỗ trợ.", StatusCodes.UNPROCESSABLE_ENTITY, { field: `evidenceDocuments.${index}.mimeType` });
        }

        const type = String(source.type || source.evidenceType || "other").trim();
        if (!COPYRIGHT_EVIDENCE_TYPES.includes(type)) {
            throw new AppError("Loại bằng chứng không hợp lệ.", StatusCodes.UNPROCESSABLE_ENTITY, { field: `evidenceDocuments.${index}.type` });
        }

        return {
            documentId: String(source.documentId || "").trim(),
            type,
            version: Number(source.version || 1),
            originalName: String(source.originalName || source.fileName || "").trim(),
            fileName: String(source.fileName || source.originalName || "").trim(),
            mimeType,
            size,
            storageUrl: String(source.storageUrl || url).trim(),
            url,
            publicId: String(source.publicId || "").trim(),
            sha256: String(source.sha256 || source.hash || "").trim().toLowerCase(),
            hash: String(source.hash || source.sha256 || "").trim().toLowerCase(),
            evidenceType: type,
            uploadedAt: source.uploadedAt ? new Date(source.uploadedAt) : null,
        };
    });
};

const getRejectionKey = (snapshot) => [
    snapshot.rejectionId,
    snapshot.submissionVersion,
    snapshot.audioVersion,
    snapshot.copyrightVersion,
    snapshot.evidenceVersion,
].join(":");

const formatAppeal = (appeal) => {
    if (!appeal) return null;
    const source = appeal.toObject?.() || appeal;
    const track = source.trackId && typeof source.trackId === "object" && source.trackId.title
        ? { ...source.trackId, _id: String(source.trackId._id) }
        : String(source.trackId?._id || source.trackId);
    const artist = source.artistId && typeof source.artistId === "object" && source.artistId.name
        ? { ...source.artistId, _id: String(source.artistId._id) }
        : String(source.artistId?._id || source.artistId);
    return {
        ...source,
        trackId: track,
        artistId: artist,
    };
};

export const createTrackReviewAppeal = async (userId, trackId, payload = {}) => {
    const { user, artist, track } = await getArtistTrack(userId, trackId);
    if (track.approvalStatus !== "rejected") {
        throw new AppError("Chỉ bài hát đang bị từ chối mới có thể gửi phản hồi quyết định.", StatusCodes.CONFLICT, { code: "TRACK_APPEAL_NOT_AVAILABLE" });
    }
    if (track.moderation?.automatic?.decision === "enforcement_block" && payload.reviewTarget !== "enforcement") {
        throw new AppError("Bài hát bị chặn bởi enforcement cần dùng luồng khiếu nại enforcement riêng.", StatusCodes.CONFLICT, { code: "TRACK_ENFORCEMENT_APPEAL_REQUIRED" });
    }
    if (track.moderation?.automatic?.decision !== "enforcement_block" && payload.reviewTarget === "enforcement") {
        throw new AppError("Normal rejection không thể dùng luồng enforcement.", StatusCodes.CONFLICT, { code: "TRACK_NORMAL_APPEAL_ONLY" });
    }

    const storedRejection = track.moderation?.lastRejection;
    if (!storedRejection?.rejectionId) {
        throw new AppError("Bài hát chưa có snapshot của lần từ chối hiện tại.", StatusCodes.CONFLICT, { code: "TRACK_REJECTION_SNAPSHOT_MISSING" });
    }

    const rejectionSnapshot = getTrackRejectionSnapshot(track);
    const rejectionKey = getRejectionKey(rejectionSnapshot);
    const existing = await TrackReviewAppeal.findOne({ trackId: track._id, rejectionKey });
    if (existing) {
        throw new AppError(
            existing.status === "pending"
                ? "Bài hát đã có phản hồi đang chờ Admin xem xét."
                : "Bạn đã gửi phản hồi cho lần từ chối hiện tại.",
            StatusCodes.CONFLICT,
            { code: existing.status === "pending" ? "TRACK_APPEAL_ALREADY_PENDING" : "TRACK_APPEAL_ALREADY_SUBMITTED" }
        );
    }

    const appeal = await TrackReviewAppeal.create({
        trackId: track._id,
        artistId: artist._id,
        reviewTarget: payload.reviewTarget || "track_submission",
        rejectionSnapshot,
        rejectionKey,
        message: normalizeMessage(payload.message),
        evidenceDocuments: normalizeEvidenceDocuments(payload.evidenceDocuments || []),
        status: "pending",
        submittedAt: new Date(),
    });

    void recordAuditEvent({
        actorUserId: userId,
        actorSnapshot: { id: userId, email: user.email || "", role: user.role || "artist" },
        action: "TRACK_APPEAL_SUBMITTED",
        targetType: "track_review_appeal",
        targetId: appeal._id,
        metadata: {
            trackId: track._id,
            appealId: appeal._id,
            artistId: artist._id,
            submissionVersion: track.submissionVersion || 1,
            audioVersion: track.audioVersion || 1,
            copyrightVersion: track.copyrightVersion || 1,
            evidenceVersion: track.evidenceVersion || 1,
        },
    }).catch(() => {});

    return formatAppeal(appeal);
};

export const uploadTrackReviewAppealEvidence = async (userId, trackId, files = []) => {
    const { track } = await getArtistTrack(userId, trackId);
    if (track.approvalStatus !== "rejected") {
        throw new AppError("Chỉ bài hát bị từ chối mới có thể bổ sung bằng chứng.", StatusCodes.CONFLICT, { code: "TRACK_APPEAL_NOT_AVAILABLE" });
    }
    if (!Array.isArray(files) || files.length === 0) {
        throw new AppError("Vui lòng chọn ít nhất một tài liệu bằng chứng.", StatusCodes.BAD_REQUEST, { field: "evidence" });
    }

    const documents = [];
    for (const [index, file] of files.entries()) {
        const fileError = validateEvidenceUploadFile(file);
        if (fileError) throw new AppError(fileError, StatusCodes.BAD_REQUEST, { field: "evidence" });
        const sha256 = crypto.createHash("sha256").update(file.buffer).digest("hex");
        const uploaded = await uploadEvidenceBuffer({
            buffer: file.buffer,
            folder: `reso/track-appeals/${track._id}`,
            publicId: `${track._id}_${Date.now()}_${index}_${sha256.slice(0, 12)}`,
        }).catch(() => null);
        if (!uploaded) throw new AppError("Không thể tải tài liệu bằng chứng lên kho lưu trữ.", StatusCodes.BAD_GATEWAY, { field: "evidence" });

        const url = uploaded.secure_url || uploaded.url || "";
        documents.push({
            documentId: crypto.randomUUID(),
            type: "other",
            evidenceType: "other",
            version: 1,
            originalName: String(file.originalname || "").trim().slice(0, 255),
            fileName: String(file.originalname || "").trim().slice(0, 255),
            mimeType: String(file.mimetype || "").trim().slice(0, 120),
            size: Number(file.size),
            storageUrl: url,
            url,
            publicId: uploaded.public_id || "",
            sha256,
            hash: sha256,
            uploadedAt: new Date(),
        });
    }
    return documents;
};

export const listArtistTrackReviewAppeals = async (userId, trackId) => {
    const { artist } = await getArtistTrack(userId, trackId);
    const appeals = await TrackReviewAppeal.find({ trackId, artistId: artist._id }).sort({ submittedAt: -1 }).lean();
    return appeals.map(formatAppeal);
};

export const getLatestArtistTrackReviewAppeal = async (userId, trackId) => {
    const { artist } = await getArtistTrack(userId, trackId);
    const appeal = await TrackReviewAppeal.findOne({ trackId, artistId: artist._id }).sort({ submittedAt: -1 }).lean();
    return formatAppeal(appeal);
};

const populateAppeal = (query) => query
    .populate({ path: "trackId", select: "title versionTitle approvalStatus rejectReason moderation submissionVersion audioVersion copyrightVersion evidenceVersion artist_artistId" })
    .populate({ path: "artistId", select: "name userId" })
    .populate({ path: "reviewedBy", select: "email role" });

export const listTrackReviewAppeals = async (query = {}) => {
    const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || 20));
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.reviewTarget) filter.reviewTarget = query.reviewTarget;
    const searchTerm = typeof query.q === "string" ? query.q.trim() : "";

    if (searchTerm) {
        const searchRegex = new RegExp(escapeRegex(searchTerm), "i");
        const [trackIds, artistIds] = await Promise.all([
            Track.find({
                $or: [{ title: searchRegex }, { versionTitle: searchRegex }],
            }).distinct("_id"),
            Artist.find({ name: searchRegex }).distinct("_id"),
        ]);

        filter.$or = [
            { trackId: { $in: trackIds } },
            { artistId: { $in: artistIds } },
            { message: searchRegex },
        ];
    }

    const [appeals, total] = await Promise.all([
        populateAppeal(TrackReviewAppeal.find(filter).sort({ submittedAt: 1 }).skip((page - 1) * limit).limit(limit)).lean(),
        TrackReviewAppeal.countDocuments(filter),
    ]);
    return {
        appeals: appeals.map(formatAppeal),
        pagination: { page, limit, total, totalPages: total ? Math.ceil(total / limit) : 0 },
    };
};

export const getTrackReviewAppeal = async (appealId) => {
    assertObjectId(appealId, "appealId");
    const appeal = await populateAppeal(TrackReviewAppeal.findById(appealId)).lean();
    if (!appeal) throw new AppError("Không tìm thấy phản hồi quyết định.", StatusCodes.NOT_FOUND);
    return formatAppeal(appeal);
};

const resolveStaleAppeal = async (appeal, track) => {
    const currentState = getCurrentTrackRejectionState(track);
    const snapshot = appeal.rejectionSnapshot?.toObject?.() || appeal.rejectionSnapshot || {};
    if (track.approvalStatus !== "rejected" || !isSameRejectionSnapshot(snapshot, currentState)) {
        appeal.status = "cancelled";
        appeal.reviewedAt = new Date();
        appeal.resolution = { action: "stale", note: "Rejection snapshot is no longer current." };
        await appeal.save();
        throw new AppError("Phản hồi này đã cũ và không thể tác động lên phiên bản hiện tại.", StatusCodes.CONFLICT, { code: "TRACK_APPEAL_STALE" });
    }
};

export const acceptTrackReviewAppeal = async (adminUserId, appealId, payload = {}) => {
    assertObjectId(appealId, "appealId");
    const appeal = await TrackReviewAppeal.findById(appealId);
    if (!appeal) throw new AppError("Không tìm thấy phản hồi quyết định.", StatusCodes.NOT_FOUND);
    if (appeal.status !== "pending") throw new AppError("Phản hồi này không còn ở trạng thái chờ xử lý.", StatusCodes.CONFLICT, { code: "TRACK_APPEAL_NOT_PENDING" });

    const track = await Track.findById(appeal.trackId);
    if (!track || track.isDeleted) throw new AppError("Track không còn tồn tại.", StatusCodes.NOT_FOUND);
    await resolveStaleAppeal(appeal, track);

    const response = typeof payload.adminResponse === "string" ? payload.adminResponse.trim() : "";
    appeal.status = "accepted";
    appeal.reviewedBy = adminUserId;
    appeal.reviewedAt = new Date();
    appeal.adminResponse = response;
    appeal.resolution = {
        action: appeal.reviewTarget === "enforcement" ? "acknowledge_enforcement_appeal" : "return_to_moderation",
        note: response,
    };

    if (appeal.reviewTarget !== "enforcement") {
        track.approvalStatus = "pending";
        track.activeStatus = "draft";
        track.rejectReason = "";
        track.moderation = {
            ...(track.moderation?.toObject?.() || track.moderation || {}),
            submittedAt: new Date(),
            reviewedBy: null,
            reviewedAt: null,
            adminNote: "",
            violationFlags: [],
            lastRejection: null,
        };
    }

    try {
        await track.save();
        await appeal.save();
    } catch (error) {
        if (error?.name === "VersionError") {
            throw new AppError("Track đã thay đổi trong lúc xử lý phản hồi.", StatusCodes.CONFLICT, { code: "TRACK_APPEAL_STALE" });
        }
        throw error;
    }

    void recordAuditEvent({
        actorUserId: adminUserId,
        action: "TRACK_APPEAL_ACCEPTED",
        targetType: "track_review_appeal",
        targetId: appeal._id,
        metadata: { trackId: track._id, appealId: appeal._id, artistId: appeal.artistId, adminId: adminUserId, submissionVersion: track.submissionVersion || 1, audioVersion: track.audioVersion || 1, copyrightVersion: track.copyrightVersion || 1, evidenceVersion: track.evidenceVersion || 1 },
    }).catch(() => {});

    return formatAppeal(await populateAppeal(TrackReviewAppeal.findById(appeal._id)).lean());
};

export const rejectTrackReviewAppeal = async (adminUserId, appealId, payload = {}) => {
    assertObjectId(appealId, "appealId");
    const response = normalizeMessage(payload.adminResponse);
    const appeal = await TrackReviewAppeal.findById(appealId);
    if (!appeal) throw new AppError("Không tìm thấy phản hồi quyết định.", StatusCodes.NOT_FOUND);
    if (appeal.status !== "pending") throw new AppError("Phản hồi này không còn ở trạng thái chờ xử lý.", StatusCodes.CONFLICT, { code: "TRACK_APPEAL_NOT_PENDING" });

    appeal.status = "rejected";
    appeal.reviewedBy = adminUserId;
    appeal.reviewedAt = new Date();
    appeal.adminResponse = response;
    appeal.resolution = { action: "keep_rejected", note: response };
    await appeal.save();

    void recordAuditEvent({ actorUserId: adminUserId, action: "TRACK_APPEAL_REJECTED", targetType: "track_review_appeal", targetId: appeal._id, metadata: { trackId: appeal.trackId, appealId: appeal._id, artistId: appeal.artistId, adminId: adminUserId } }).catch(() => {});
    return formatAppeal(await populateAppeal(TrackReviewAppeal.findById(appeal._id)).lean());
};

export default {
    createTrackReviewAppeal,
    uploadTrackReviewAppealEvidence,
    listArtistTrackReviewAppeals,
    getLatestArtistTrackReviewAppeal,
    listTrackReviewAppeals,
    getTrackReviewAppeal,
    acceptTrackReviewAppeal,
    rejectTrackReviewAppeal,
};
