import mongoose from "mongoose";
import Podcast from "../../models/Podcast.js";
import PodcastModerationReview from "../../models/PodcastModerationReview.js";
import { AppError } from "../../utils/AppError.js";
import { validatePodcastForSubmit } from "./podcast.validation.service.js";

export const PODCAST_REVIEW_EVENT_TYPES = [
    "OPEN_PODCAST_DETAIL",
    "OPEN_METADATA",
    "OPEN_COPYRIGHT_SECTION",
    "OPEN_AUDIO",
    "AUDIO_PLAY_STARTED",
    "AUDIO_PLAY_PROGRESS",
    "AUDIO_REVIEWED",
    "FINAL_CONFIRMATION",
];

const DEFAULT_AUDIO_REVIEW_SECONDS = 15;

const getAudioReviewMinimum = () => {
    const value = Number(process.env.ADMIN_AUDIO_REVIEW_MIN_SECONDS);
    return Number.isFinite(value) ? Math.min(60, Math.max(1, value)) : DEFAULT_AUDIO_REVIEW_SECONDS;
};

const ensureObjectId = (value, field) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new AppError(`${field} không hợp lệ.`, 400, { field });
    }
};

const hasEvent = (review, type) => review.events.some((event) => event.type === type);

const getSnapshot = (podcast) => ({
    title: podcast.title || "",
    description: podcast.description || "",
    audioUrl: podcast.audioUrl || "",
    coverImageUrl: podcast.coverImageUrl || "",
    duration: Number(podcast.duration || 0),
    copyrightType: podcast.copyrightType || "",
    copyrightSource: podcast.copyrightSource || "",
    copyrightProofUrl: podcast.copyrightProofUrl || "",
    copyrightConfirmed: podcast.copyrightConfirmed === true,
});

const normalizeSnapshot = (value) => {
    const plainValue = typeof value?.toObject === "function"
        ? value.toObject({ depopulate: true, flattenMaps: true })
        : value;

    return getSnapshot(plainValue || {});
};

const snapshotsMatch = (left, right) => JSON.stringify(normalizeSnapshot(left)) === JSON.stringify(normalizeSnapshot(right));

const getLatestReview = (podcastId, adminId) => PodcastModerationReview.findOne({ podcastId, adminId })
    .sort({ updatedAt: -1, _id: -1 });

const getRequiredAudioReviewSeconds = (duration) => Math.min(
    getAudioReviewMinimum(),
    Math.max(0, Number(duration) || 0),
);

const buildChecklist = (podcast, review) => {
    const minimumAudioSeconds = getRequiredAudioReviewSeconds(podcast.duration);
    const audioReviewed = Boolean(
        podcast.audioUrl &&
        hasEvent(review, "OPEN_AUDIO") &&
        hasEvent(review, "AUDIO_PLAY_STARTED") &&
        Number(review.audioListenedSeconds || 0) >= minimumAudioSeconds
    );
    const checklist = {
        podcastOpened: hasEvent(review, "OPEN_PODCAST_DETAIL"),
        metadataChecked: hasEvent(review, "OPEN_METADATA"),
        copyrightViewed: hasEvent(review, "OPEN_COPYRIGHT_SECTION"),
        audioReviewed,
        audioListenedSeconds: Number(review.audioListenedSeconds || 0),
        minimumAudioSeconds,
        finalConfirmed: Boolean(review.finalConfirmedAt) || hasEvent(review, "FINAL_CONFIRMATION"),
    };
    const missing = [];
    if (!checklist.podcastOpened) missing.push("podcast_opened");
    if (!checklist.metadataChecked) missing.push("metadata_checked");
    if (!checklist.copyrightViewed) missing.push("copyright_viewed");
    if (!checklist.audioReviewed) missing.push("audio_reviewed");
    if (!checklist.finalConfirmed) missing.push("final_confirmation");
    return { checklist, missing };
};

const serializeReview = (review, result) => ({
    id: String(review._id),
    podcastId: String(review.podcastId),
    adminId: String(review.adminId),
    status: review.status,
    audioListenedSeconds: Number(review.audioListenedSeconds || 0),
    finalConfirmedAt: review.finalConfirmedAt,
    events: review.events.map((event) => ({
        id: String(event._id),
        type: event.type,
        deltaSeconds: Number(event.deltaSeconds || 0),
        createdAt: event.createdAt,
    })),
    checklist: result.checklist,
    missing: result.missing,
});

const assertCurrentSnapshot = (podcast, review) => {
    if (!snapshotsMatch(podcast, review.snapshot)) {
        throw new AppError("Podcast đã được cập nhật. Vui lòng mở lại phiên kiểm duyệt.", 409, {
            code: "STALE_REVIEW_SESSION",
            field: "reviewSessionId",
        });
    }
};

export const ensureReviewSession = async (adminId, podcastId) => {
    ensureObjectId(adminId, "adminId");
    ensureObjectId(podcastId, "podcastId");
    const podcast = await Podcast.findById(podcastId);
    if (!podcast) throw new AppError("Không tìm thấy Podcast.", 404, { field: "podcastId" });
    if (podcast.isDeleted) throw new AppError("Podcast đã bị xóa.", 409, { code: "PODCAST_DELETED" });
    if (podcast.isBlocked) throw new AppError("Podcast đang bị khóa.", 409, { code: "PODCAST_BLOCKED" });
    if (podcast.approvalStatus !== "pending") {
        throw new AppError("Podcast hiện không có yêu cầu duyệt.", 409, { field: "status" });
    }

    let review = await getLatestReview(podcast._id, adminId);
    if (review?.status === "active") {
        try {
            assertCurrentSnapshot(podcast, review);
            review.events.push({ type: "OPEN_PODCAST_DETAIL" });
            await review.save();
            return serializeReview(review, buildChecklist(podcast, review));
        } catch (error) {
            if (error?.details?.code !== "STALE_REVIEW_SESSION") throw error;
            review.status = "abandoned";
            await review.save();
        }
    }

    review = await PodcastModerationReview.create({
        podcastId: podcast._id,
        adminId,
        snapshot: getSnapshot(podcast),
        events: [{ type: "OPEN_PODCAST_DETAIL" }],
    });
    return serializeReview(review, buildChecklist(podcast, review));
};

export const recordReviewEvent = async (adminId, podcastId, payload = {}) => {
    ensureObjectId(adminId, "adminId");
    ensureObjectId(podcastId, "podcastId");
    if (!PODCAST_REVIEW_EVENT_TYPES.includes(payload.type)) {
        throw new AppError("Loại sự kiện kiểm duyệt Podcast không hợp lệ.", 400, { field: "type" });
    }

    const podcast = await Podcast.findById(podcastId);
    if (!podcast) throw new AppError("Không tìm thấy Podcast.", 404, { field: "podcastId" });
    const review = await getLatestReview(podcast._id, adminId);
    if (!review || review.status !== "active") {
        return ensureReviewSession(adminId, podcastId);
    }
    assertCurrentSnapshot(podcast, review);

    if (payload.type === "AUDIO_PLAY_PROGRESS") {
        if (!hasEvent(review, "AUDIO_PLAY_STARTED")) {
            throw new AppError("Cần bắt đầu phát audio trước khi gửi tiến trình.", 409, { field: "type" });
        }
        const deltaSeconds = Math.min(30, Math.max(0, Number(payload.deltaSeconds) || 0));
        review.audioListenedSeconds = Math.min(
            Number(podcast.duration) || Number.MAX_SAFE_INTEGER,
            Number(review.audioListenedSeconds || 0) + deltaSeconds,
        );
        review.events.push({ type: payload.type, deltaSeconds });
    } else {
        review.events.push({ type: payload.type });
        if (payload.type === "FINAL_CONFIRMATION") review.finalConfirmedAt = new Date();
    }
    await review.save();
    return serializeReview(review, buildChecklist(podcast, review));
};

export const assertReviewCanApprove = async (podcast, adminId, reviewSessionId) => {
    ensureObjectId(adminId, "adminId");
    const review = await getLatestReview(podcast._id, adminId);
    if (!review || review.status !== "active") {
        throw new AppError("Admin cần mở phiên kiểm duyệt trước khi duyệt Podcast.", 409, {
            code: "REVIEW_CHECKLIST_INCOMPLETE",
            missing: ["review_session"],
        });
    }
    if (!reviewSessionId || String(reviewSessionId) !== String(review._id)) {
        throw new AppError("Phiên kiểm duyệt không khớp hoặc đã hết hiệu lực.", 409, {
            code: "STALE_REVIEW_SESSION",
            field: "reviewSessionId",
        });
    }
    assertCurrentSnapshot(podcast, review);
    const result = buildChecklist(podcast, review);
    if (result.missing.length > 0) {
        throw new AppError("Chưa hoàn tất checklist kiểm duyệt Podcast.", 409, {
            code: "REVIEW_CHECKLIST_INCOMPLETE",
            missing: result.missing,
            checklist: result.checklist,
        });
    }
    validatePodcastForSubmit(podcast);
    return { review, checklist: result.checklist };
};

export const completeReview = async (review, decision) => {
    review.status = "completed";
    review.decision = decision;
    review.completedAt = new Date();
    await review.save();
};

export default { ensureReviewSession, recordReviewEvent, assertReviewCanApprove, completeReview };
