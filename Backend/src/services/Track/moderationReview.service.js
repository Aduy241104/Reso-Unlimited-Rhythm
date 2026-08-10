import crypto from "node:crypto";
import mongoose from "mongoose";
import Track from "../../models/Track.js";
import AudioFingerprint from "../../models/AudioFingerprint.js";
import AudioFingerprintMatch from "../../models/AudioFingerprintMatch.js";
import TrackModerationReview from "../../models/TrackModerationReview.js";
import { AppError } from "../../utils/AppError.js";
import { recordAuditEvent } from "../audit/auditLog.service.js";
import { validateCopyrightForSubmit } from "./copyright.validation.service.js";
import {
    getMusicBrainzResultForTrack,
    runMusicBrainzVerification,
} from "../external/musicbrainz.service.js";
import {
    getAcoustIdResultForTrack,
    markAcoustIdReviewed,
    recordAcoustIdOverride,
    runAcoustIdVerification,
} from "../external/acoustid.service.js";
import { activeFingerprintScopeFilter } from "../fingerprint/fingerprint.lifecycle.service.js";

export const REVIEW_EVENT_TYPES = [
    "OPEN_TRACK_DETAIL",
    "OPEN_COPYRIGHT_SECTION",
    "OPEN_METADATA",
    "OPEN_AUDIO",
    "AUDIO_PLAY_STARTED",
    "AUDIO_PLAY_PROGRESS",
    "AUDIO_REVIEWED",
    "OPEN_FINGERPRINT_RESULT",
    "OPEN_ACOUSTID_RESULT",
    "OPEN_MUSICBRAINZ_RESULT",
    "OPEN_LICENSE_DOCUMENT",
    "DOWNLOAD_LICENSE_DOCUMENT",
    "OPEN_LYRICS",
    "OPEN_LRC",
    "FINAL_CONFIRMATION",
];

const DEFAULT_AUDIO_REVIEW_SECONDS = 15;

const stableValue = (value, ancestors = new WeakSet()) => {
    if (Array.isArray(value)) return value.map((item) => stableValue(item, ancestors));
    if (!value || typeof value !== "object") return value;
    if (value instanceof Date) return value.toISOString();
    if (Buffer.isBuffer(value)) return value.toString("base64");
    if (typeof value.toHexString === "function") return value.toHexString();

    // Mongoose documents/subdocuments expose internal enumerable fields such as
    // `$__parent`. Walking those fields directly creates a cycle back to Track and
    // eventually throws "Maximum call stack size exceeded" while opening a review.
    if (typeof value.toObject === "function") {
        return stableValue(value.toObject({
            depopulate: true,
            flattenMaps: true,
            getters: false,
            virtuals: false,
        }), ancestors);
    }

    if (ancestors.has(value)) return "[Circular]";
    ancestors.add(value);
    const result = Object.keys(value).sort().reduce((output, key) => {
        output[key] = stableValue(value[key], ancestors);
        return output;
    }, {});
    ancestors.delete(value);
    return result;
};

export const hashReviewSnapshotValue = (value) => crypto
    .createHash("sha256")
    .update(JSON.stringify(stableValue(value)))
    .digest("hex");

const ensureObjectId = (value, field) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new AppError(`${field} không hợp lệ.`, 400, { field });
    }
};

const getAudioReviewMinimum = () => {
    const value = Number(process.env.ADMIN_AUDIO_REVIEW_MIN_SECONDS);
    return Number.isFinite(value) ? Math.min(60, Math.max(1, value)) : DEFAULT_AUDIO_REVIEW_SECONDS;
};

const getReviewTarget = (track) => {
    const isPendingUpdate = track?.pendingUpdate?.status === "pending" && track.pendingUpdate.data;
    const target = isPendingUpdate ? track.pendingUpdate.data : track;
    const versions = isPendingUpdate
        ? {
            submission: Number(track.pendingUpdate.submissionVersion || track.submissionVersion || 1),
            audio: Number(track.pendingUpdate.audioVersion || track.audioVersion || 1),
            copyright: Number(track.pendingUpdate.copyrightVersion || track.copyrightVersion || 1),
            evidence: Number(track.pendingUpdate.evidenceVersion || track.evidenceVersion || 1),
        }
        : {
            submission: Number(track.submissionVersion || 1),
            audio: Number(track.audioVersion || 1),
            copyright: Number(track.copyrightVersion || 1),
            evidence: Number(track.evidenceVersion || 1),
        };

    const audio = Array.isArray(target?.audioFiles) ? target.audioFiles : [];
    const copyright = target?.copyright || {};
    const evidence = Array.isArray(copyright.copyrightEvidenceDocuments)
        ? copyright.copyrightEvidenceDocuments.filter((item) => item?.uploadStatus === "uploaded")
        : [];
    const legacyUrls = Array.isArray(copyright.licenseDocumentUrls)
        ? copyright.licenseDocumentUrls.filter(Boolean)
        : [];

    return {
        source: isPendingUpdate ? "pending_update" : "track_release",
        target,
        versions,
        audioHash: hashReviewSnapshotValue(audio.map((file) => ({ url: file?.url || "", label: file?.label || "", format: file?.format || "" }))),
        copyrightHash: hashReviewSnapshotValue(copyright),
        evidenceHash: hashReviewSnapshotValue({ evidence, legacyUrls }),
        hasUploadedEvidence: evidence.length > 0,
        evidenceItems: [
            ...evidence.map((item) => ({
                id: String(item.documentId),
                version: Number(item.version || 1),
                hash: item.sha256 || hashReviewSnapshotValue(item),
            })),
            ...legacyUrls.map((url) => ({ id: String(url), version: 1, hash: hashReviewSnapshotValue(url) })),
        ],
    };
};

const getLatestReview = (trackId, adminId) => TrackModerationReview.findOne({
    trackId,
    adminId,
}).sort({ updatedAt: -1, _id: -1 });

const hasEvent = (review, type, resourceId = null) => review.events.some((event) =>
    event.type === type && (resourceId === null || String(event.resourceId || "") === String(resourceId))
);

export const hasCompletedAudioReview = ({
    review,
    audioRequired,
    minimumAudioSeconds,
}) => !audioRequired || (
    hasEvent(review, "OPEN_AUDIO") &&
    hasEvent(review, "AUDIO_PLAY_STARTED") &&
    Number(review.audioListenedSeconds || 0) >= Number(minimumAudioSeconds || 0)
);

export const hasReviewedStaticLyrics = ({ review, lyricsStatic }) => (
    !String(lyricsStatic || "").trim() || hasEvent(review, "OPEN_LYRICS")
);

const getFingerprintRisk = async (trackId) => {
    const fingerprint = await AudioFingerprint.findOne({
        trackId,
        algorithm: "chromaprint",
        algorithmVersion: "chromaprint-v1",
        ...activeFingerprintScopeFilter(),
    }).select("status sourceAudioHash fingerprintHash audioVersion").lean();

    const versionMatch = {
        $or: [
            { sourceTrackId: trackId, $or: [{ sourceAudioVersion: fingerprint?.audioVersion || null }, { sourceAudioVersion: null }] },
            { matchedTrackId: trackId, $or: [{ matchedAudioVersion: fingerprint?.audioVersion || null }, { matchedAudioVersion: null }] },
        ],
    };

    const highMatch = await AudioFingerprintMatch.findOne({
        $and: [
            { status: { $in: ["detected", "under_review", "confirmed"] } },
            { matchingScope: { $in: ["active", null] } },
            versionMatch,
            { $or: [{ matchType: "exact_file_duplicate" }, { severity: "high" }, { riskLevel: "high" }] },
        ],
    }).sort({ createdAt: -1 }).lean();

    const reviewMatch = await AudioFingerprintMatch.findOne({
        $and: [
            { status: { $in: ["detected", "under_review", "confirmed"] } },
            { matchingScope: { $in: ["active", null] } },
            versionMatch,
            { $or: [{ severity: "review" }, { riskLevel: "medium" }] },
        ],
    }).sort({ similarityScore: -1, createdAt: -1 }).lean();

    return { fingerprint, highMatch, reviewMatch };
};

const buildChecklist = async (track, review) => {
    const target = getReviewTarget(track);
    const minimumAudioSeconds = getAudioReviewMinimum();
    const { fingerprint, highMatch, reviewMatch } = await getFingerprintRisk(track._id);
    const [musicBrainz, acoustId] = await Promise.all([
        getMusicBrainzResultForTrack(track._id),
        getAcoustIdResultForTrack(track._id),
    ]);
    const audioRequired = target.target?.audioFiles?.length > 0;
    const audioReviewed = hasCompletedAudioReview({ review, audioRequired, minimumAudioSeconds });
    const evidenceReviewed = target.evidenceItems.filter((item) =>
        !hasEvent(review, "OPEN_LICENSE_DOCUMENT", item.id) &&
        !hasEvent(review, "DOWNLOAD_LICENSE_DOCUMENT", item.id)
    );
    const evidenceAvailable = target.hasUploadedEvidence;
    const fingerprintReady = fingerprint?.status === "completed" && Number(fingerprint.audioVersion || 1) === Number(target.versions.audio);
    const screeningStatus = track.fingerprintScreening?.status || "unknown";
    const fingerprintBlocked = !fingerprintReady || !["passed", "flagged"].includes(screeningStatus);
    const highRisk = Boolean(highMatch) || track.fingerprintScreening?.riskLevel === "high" || track.fingerprintScreening?.exactDuplicate === true;
    const mediumRisk = Boolean(reviewMatch) || track.fingerprintScreening?.riskLevel === "medium" || screeningStatus === "flagged";
    const musicBrainzResult = musicBrainz.externalResult;
    const musicBrainzReady = Boolean(
        musicBrainzResult &&
        ["matched", "possible_match", "not_found"].includes(musicBrainzResult.status) &&
        Number(musicBrainzResult.submissionVersion || 0) === Number(target.versions.submission)
    );
    const acoustIdResult = acoustId.result;
    const acoustIdReady = Boolean(
        acoustIdResult &&
        ["matched", "possible_match", "not_found", "failed"].includes(acoustIdResult.status) &&
        Number(acoustIdResult.submissionVersion || 0) === Number(target.versions.submission) &&
        Number(acoustIdResult.audioVersion || 0) === Number(target.versions.audio)
    );

    const checklist = {
        trackOpened: hasEvent(review, "OPEN_TRACK_DETAIL"),
        copyrightViewed: hasEvent(review, "OPEN_COPYRIGHT_SECTION"),
        metadataChecked: hasEvent(review, "OPEN_METADATA"),
        audioReviewed,
        fingerprintViewed: hasEvent(review, "OPEN_FINGERPRINT_RESULT"),
        acoustIdViewed: hasEvent(review, "OPEN_ACOUSTID_RESULT"),
        acoustIdReady,
        acoustIdStatus: acoustIdResult?.status || "pending",
        acoustIdDecision: acoustIdResult?.decision || "review_required",
        acoustIdResult: acoustIdResult || null,
        musicBrainzViewed: hasEvent(review, "OPEN_MUSICBRAINZ_RESULT"),
        musicBrainzReady,
        musicBrainzStatus: musicBrainzResult?.status || "pending",
        musicBrainzResult: musicBrainzResult || null,
        lyricsReviewed: hasReviewedStaticLyrics({ review, lyricsStatic: target.target?.lyricsStatic }),
        lrcReviewed: !target.target?.lyricsSyncUrl || hasEvent(review, "OPEN_LRC"),
        evidenceAvailable,
        evidenceReviewed: evidenceAvailable && evidenceReviewed.length === 0,
        finalConfirmed: Boolean(review.finalConfirmedAt) || hasEvent(review, "FINAL_CONFIRMATION"),
        audioListenedSeconds: Number(review.audioListenedSeconds || 0),
        minimumAudioSeconds,
        requiredEvidenceIds: target.evidenceItems.map((item) => item.id),
        reviewedEvidenceIds: target.evidenceItems
            .filter((item) => !evidenceReviewed.some((missing) => missing.id === item.id))
            .map((item) => item.id),
        fingerprintStatus: fingerprint?.status || "missing",
        screeningStatus,
        highRisk,
        mediumRisk,
        highMatchTrackId: highMatch?.sourceTrackId?.toString() === track._id.toString()
            ? highMatch?.matchedTrackId || null
            : highMatch?.sourceTrackId || null,
        versions: target.versions,
    };

    const missing = [];
    if (!checklist.trackOpened) missing.push("track_opened");
    if (!checklist.copyrightViewed) missing.push("copyright_viewed");
    if (!checklist.metadataChecked) missing.push("metadata_checked");
    if (!checklist.audioReviewed) missing.push("audio_reviewed");
    if (!checklist.fingerprintViewed) missing.push("fingerprint_viewed");
    if (!checklist.acoustIdViewed) missing.push("acoustid_result_viewed");
    if (!checklist.acoustIdReady) missing.push("acoustid_result");
    if (!checklist.musicBrainzViewed) missing.push("musicbrainz_result_viewed");
    if (!checklist.musicBrainzReady) missing.push("musicbrainz_result");
    if (!checklist.lyricsReviewed) missing.push("lyrics_reviewed");
    if (!checklist.lrcReviewed) missing.push("lrc_reviewed");
    if (!checklist.evidenceAvailable) missing.push("copyright_evidence");
    else if (!checklist.evidenceReviewed) missing.push(...evidenceReviewed.map((item) => `evidence:${item.id}`));
    if (!checklist.finalConfirmed) missing.push("final_confirmation");
    if (fingerprintBlocked) missing.push("fingerprint_screening");
    if (highRisk) missing.push("high_risk_fingerprint");

    return { checklist, missing, mediumRisk };
};

const assertCurrentReviewSnapshot = (track, review) => {
    const target = getReviewTarget(track);
    const current = {
        source: target.source,
        submission: target.versions.submission,
        audio: target.versions.audio,
        copyright: target.versions.copyright,
        evidence: target.versions.evidence,
        audioHash: target.audioHash,
        copyrightHash: target.copyrightHash,
        evidenceHash: target.evidenceHash,
    };
    const saved = {
        source: review.source,
        submission: review.versions.submission,
        audio: review.versions.audio,
        copyright: review.versions.copyright,
        evidence: review.versions.evidence,
        audioHash: review.versions.audioHash,
        copyrightHash: review.versions.copyrightHash,
        evidenceHash: review.versions.evidenceHash,
    };
    if (JSON.stringify(current) !== JSON.stringify(saved)) {
        throw new AppError("Track đã được cập nhật. Vui lòng rà soát lại từ đầu.", 409, {
            code: "STALE_REVIEW_SESSION",
            field: "reviewSession",
        });
    }
    return target;
};

export const ensureReviewSession = async (adminId, trackId) => {
    ensureObjectId(adminId, "adminId");
    ensureObjectId(trackId, "trackId");
    const track = await Track.findById(trackId);
    if (!track) throw new AppError("Không tìm thấy bài hát.", 404, { field: "trackId" });
    if (track.approvalStatus !== "pending" && track.pendingUpdate?.status !== "pending") {
        throw new AppError("Bài hát hiện không có yêu cầu duyệt.", 409, { field: "status" });
    }

    const target = getReviewTarget(track);
    let review = await getLatestReview(track._id, adminId);
    const snapshot = {
        submission: target.versions.submission,
        audio: target.versions.audio,
        copyright: target.versions.copyright,
        evidence: target.versions.evidence,
        audioHash: target.audioHash,
        copyrightHash: target.copyrightHash,
        evidenceHash: target.evidenceHash,
    };

    if (review && review.status === "active") {
        try {
            assertCurrentReviewSnapshot(track, review);
            review.events.push({ type: "OPEN_TRACK_DETAIL", createdAt: new Date() });
            await review.save();
            void recordAuditEvent({
                actorUserId: adminId,
                action: "TRACK_REVIEW_OPEN_TRACK_DETAIL",
                targetType: "track",
                targetId: track._id,
                metadata: { reviewSessionId: review._id, source: review.source },
            }).catch((error) => console.error("Track review reopen audit failed:", error.message));
            return serializeReview(review, await buildChecklist(track, review));
        } catch (error) {
            if (error?.details?.code !== "STALE_REVIEW_SESSION") throw error;
            review.status = "abandoned";
            await review.save();
        }
    }

    review = await TrackModerationReview.create({
        trackId: track._id,
        adminId,
        source: target.source,
        versions: snapshot,
        events: [{ type: "OPEN_TRACK_DETAIL", createdAt: new Date() }],
    });

    void recordAuditEvent({
        actorUserId: adminId,
        action: "TRACK_REVIEW_OPEN_TRACK_DETAIL",
        targetType: "track",
        targetId: track._id,
        metadata: {
            reviewSessionId: review._id,
            source: target.source,
            versions: target.versions,
        },
    }).catch((error) => console.error("Track review session audit failed:", error.message));

    return serializeReview(review, await buildChecklist(track, review));
};

const serializeReview = (review, result) => ({
    id: String(review._id),
    trackId: String(review.trackId),
    adminId: String(review.adminId),
    source: review.source,
    status: review.status,
    audioListenedSeconds: Number(review.audioListenedSeconds || 0),
    finalConfirmedAt: review.finalConfirmedAt,
    events: review.events.map((event) => ({
        id: String(event._id),
        type: event.type,
        resourceId: event.resourceId || "",
        createdAt: event.createdAt,
    })),
    checklist: result.checklist,
    missing: result.missing,
});

export const getReviewSession = async (adminId, trackId) => ensureReviewSession(adminId, trackId);

export const recordReviewEvent = async (adminId, trackId, payload = {}) => {
    ensureObjectId(adminId, "adminId");
    ensureObjectId(trackId, "trackId");
    if (!REVIEW_EVENT_TYPES.includes(payload.type)) {
        throw new AppError("Loại sự kiện kiểm duyệt không hợp lệ.", 400, { field: "type" });
    }

    const track = await Track.findById(trackId);
    if (!track) throw new AppError("Không tìm thấy bài hát.", 404, { field: "trackId" });
    const review = await getLatestReview(track._id, adminId);
    if (!review || review.status !== "active") return ensureReviewSession(adminId, trackId);
    const target = assertCurrentReviewSnapshot(track, review);
    const resourceId = String(payload.resourceId || "");

    // An explicit Admin action always refreshes the external reference so a
    // previously cached miss can pick up MusicBrainz metadata added later.
    if (payload.type === "OPEN_MUSICBRAINZ_RESULT") {
        await runMusicBrainzVerification(track._id, { force: true });
    }
    if (payload.type === "OPEN_ACOUSTID_RESULT") {
        await runAcoustIdVerification(track._id, { retryFailed: true });
        await markAcoustIdReviewed(track._id, adminId);
    }

    if (["OPEN_LICENSE_DOCUMENT", "DOWNLOAD_LICENSE_DOCUMENT"].includes(payload.type)) {
        const evidence = target.evidenceItems.find((item) => item.id === resourceId);
        if (!evidence) throw new AppError("Tài liệu bản quyền không thuộc phiên bản đang duyệt.", 409, { field: "resourceId" });
        payload.resourceVersion = evidence.version;
        payload.resourceHash = evidence.hash;
    }

    if (["OPEN_AUDIO", "AUDIO_PLAY_STARTED", "AUDIO_PLAY_PROGRESS", "AUDIO_REVIEWED"].includes(payload.type) && target.target?.audioFiles?.length === 0) {
        throw new AppError("Track chưa có audio để rà soát.", 409, { field: "audioFiles" });
    }

    if (payload.type === "AUDIO_PLAY_PROGRESS") {
        if (!hasEvent(review, "AUDIO_PLAY_STARTED")) {
            throw new AppError("Cần bắt đầu phát audio trước khi gửi tiến trình.", 409, { field: "type" });
        }
        const delta = Math.min(30, Math.max(0, Number(payload.deltaSeconds) || 0));
        review.audioListenedSeconds = Math.min(
            Number(track.duration) || Number.MAX_SAFE_INTEGER,
            Number(review.audioListenedSeconds || 0) + delta
        );
        payload.deltaSeconds = delta;
    }

    review.events.push({
        type: payload.type,
        resourceId,
        resourceVersion: Number(payload.resourceVersion || target.versions.submission),
        resourceHash: payload.resourceHash || "",
        deltaSeconds: Number(payload.deltaSeconds || 0),
        metadata: payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {},
        createdAt: new Date(),
    });
    if (payload.type === "FINAL_CONFIRMATION") review.finalConfirmedAt = new Date();
    await review.save();
    void recordAuditEvent({
        actorUserId: adminId,
        action: `TRACK_REVIEW_${payload.type}`,
        targetType: "track",
        targetId: track._id,
        metadata: {
            reviewSessionId: review._id,
            eventType: payload.type,
            resourceId,
            resourceVersion: payload.resourceVersion || target.versions.submission,
            audioListenedSeconds: review.audioListenedSeconds,
            versions: target.versions,
        },
    }).catch((error) => console.error("Track review audit failed:", error.message));
    return serializeReview(review, await buildChecklist(track, review));
};

export const isInternalFingerprintApprovalBlocked = (checklist = {}) => Boolean(checklist.highRisk);

export const assertAcoustIdApprovalAllowed = ({
    checklist = {},
    payload = {},
    overrideAuthorized = false,
}) => {
    if (checklist.acoustIdStatus === "pending") {
        throw new AppError("AcoustID audio verification is still pending.", 409, {
            code: "ACOUSTID_PENDING",
            checklist,
        });
    }
    const needsOverride = checklist.acoustIdStatus === "failed" || checklist.acoustIdDecision === "blocked";
    if (needsOverride) {
        if (!overrideAuthorized) {
            throw new AppError("This AcoustID result can only be overridden by an authorized moderator.", 403, {
                code: "ACOUSTID_OVERRIDE_FORBIDDEN",
                checklist,
            });
        }
        if (!payload.acoustIdOverride || !String(payload.acoustIdOverrideReason || "").trim()) {
            throw new AppError("An AcoustID override reason is required.", 409, {
                code: "ACOUSTID_OVERRIDE_REASON_REQUIRED",
                field: "acoustIdOverrideReason",
                checklist,
            });
        }
        return { overrideUsed: true };
    }
    if (checklist.acoustIdDecision === "review_required" && String(payload.adminNote || "").trim().length < 10) {
        throw new AppError("A manual external-audio review reason of at least 10 characters is required.", 409, {
            code: "ACOUSTID_MANUAL_REVIEW_REASON_REQUIRED",
            field: "adminNote",
            checklist,
        });
    }
    return { overrideUsed: false };
};

export const assertReviewCanApprove = async (track, adminId, payload = {}) => {
    if (!track || (track.approvalStatus !== "pending" && track.pendingUpdate?.status !== "pending")) {
        throw new AppError("Track không còn ở trạng thái chờ duyệt.", 409, { field: "status" });
    }
    const review = await getLatestReview(track._id, adminId);
    if (!review || review.status !== "active") {
        throw new AppError("Admin cần mở phiên kiểm duyệt trước khi duyệt.", 409, {
            code: "REVIEW_CHECKLIST_INCOMPLETE",
            missing: ["review_session"],
        });
    }
    if (!payload.reviewSessionId || String(payload.reviewSessionId) !== String(review._id)) {
        throw new AppError("Phiên kiểm duyệt không khớp hoặc đã hết hiệu lực.", 409, {
            code: "STALE_REVIEW_SESSION",
            field: "reviewSessionId",
        });
    }
    assertCurrentReviewSnapshot(track, review);
    const reviewTarget = getReviewTarget(track).target;
    try {
        validateCopyrightForSubmit(reviewTarget?.copyright?.toObject?.() || reviewTarget?.copyright || {});
    } catch (error) {
        throw new AppError("Không thể duyệt khi khai báo bản quyền chưa hợp lệ.", 409, {
            code: "COPYRIGHT_DECLARATION_INVALID",
            details: error.details || null,
        });
    }
    const result = await buildChecklist(track, review);
    if (result.missing.length > 0) {
        const missingWithoutMedium = result.missing.filter((item) => item !== "high_risk_fingerprint");
        if (missingWithoutMedium.length > 0) {
            throw new AppError("Chưa hoàn tất checklist kiểm duyệt.", 409, {
                code: "REVIEW_CHECKLIST_INCOMPLETE",
                missing: result.missing,
                checklist: result.checklist,
            });
        }
    }
    if (isInternalFingerprintApprovalBlocked(result.checklist)) {
        throw new AppError("Fingerprint có dấu hiệu trùng/độ tin cậy cao, không thể duyệt thông thường.", 409, {
            code: "HIGH_RISK_FINGERPRINT",
            checklist: result.checklist,
        });
    }
    const acoustIdGuard = assertAcoustIdApprovalAllowed({
        checklist: result.checklist,
        payload,
        overrideAuthorized: payload.moderationRole === "admin",
    });
    if (result.mediumRisk && String(payload.fingerprintOverrideReason || "").trim().length < 10) {
        throw new AppError("Match fingerprint mức trung bình cần lý do override tối thiểu 10 ký tự.", 409, {
            code: "FINGERPRINT_OVERRIDE_REASON_REQUIRED",
            field: "fingerprintOverrideReason",
            checklist: result.checklist,
        });
    }
    if (acoustIdGuard.overrideUsed) {
        const overrideReason = String(payload.acoustIdOverrideReason || "").trim();
        await recordAcoustIdOverride(track._id, adminId, overrideReason);
        await recordAuditEvent({
            actorUserId: adminId,
            actorSnapshot: { role: payload.moderationRole || "" },
            action: "TRACK_REVIEW_ACOUSTID_OVERRIDE",
            targetType: "track",
            targetId: track._id,
            metadata: {
                reviewSessionId: review._id,
                status: result.checklist.acoustIdStatus,
                decision: result.checklist.acoustIdDecision,
                reasonCodes: result.checklist.acoustIdResult?.reasonCodes || [],
                overrideReason,
            },
        });
    }
    return { review, checklist: result.checklist };
};

export default {
    ensureReviewSession,
    getReviewSession,
    recordReviewEvent,
    assertReviewCanApprove,
};
