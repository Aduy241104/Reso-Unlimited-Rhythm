import mongoose from "mongoose";
import Podcast from "../../models/Podcast.js";
import Artist from "../../models/Artist.js";
import { AppError } from "../../utils/AppError.js";
import { normalizePodcast } from "./podcast.service.js";
import podcastModerationService from "./podcast.moderation.service.js";

const pageInfo = (query = {}) => {
    const pageValue = Number.parseInt(query.page, 10);
    const limitValue = Number.parseInt(query.limit, 10);
    const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
    const limit = Number.isInteger(limitValue) && limitValue > 0 ? Math.min(limitValue, 50) : 20;
    return { page, limit };
};

const populate = [
    { path: "creator", select: "name avatar userId" },
    { path: "reviewedBy", select: "email profile.fullName" },
    { path: "blockedBy", select: "email profile.fullName" },
];

const findPodcast = async (podcastId) => {
    if (!mongoose.isValidObjectId(podcastId)) throw new AppError("Podcast not found.", 404, { code: "PODCAST_NOT_FOUND" });
    const podcast = await Podcast.findById(podcastId).populate(populate);
    if (!podcast) throw new AppError("Podcast not found.", 404, { code: "PODCAST_NOT_FOUND" });
    return podcast;
};

const listAdminPodcasts = async (query = {}) => {
    const { page, limit } = pageInfo(query);
    const filter = {};
    if (query.includeDeleted !== true && query.includeDeleted !== "true") filter.isDeleted = { $ne: true };
    if (query.status === "blocked") filter.isBlocked = true;
    else if (query.status && query.status !== "all") filter.approvalStatus = query.status;

    if (query.q?.trim()) {
        const regex = new RegExp(query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        const artists = await Artist.find({ name: regex }).select("_id").lean();
        filter.$or = [{ title: regex }, { creator: { $in: artists.map((artist) => artist._id) } }];
    }

    const [items, total] = await Promise.all([
        Podcast.find(filter).populate(populate).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        Podcast.countDocuments(filter),
    ]);
    return {
        podcasts: items.map(normalizePodcast),
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
};

const getAdminPodcast = async (podcastId) => normalizePodcast((await findPodcast(podcastId)).toObject());

const approvePodcast = async (podcastId, adminId, reviewSessionId) => {
    const podcast = await findPodcast(podcastId);
    if (podcast.isDeleted) throw new AppError("Deleted podcasts cannot be approved.", 409, { code: "PODCAST_DELETED" });
    if (podcast.isBlocked) throw new AppError("Blocked podcasts cannot be approved.", 409, { code: "PODCAST_BLOCKED" });
    if (podcast.approvalStatus !== "pending") throw new AppError("Only pending podcasts can be approved.", 409, { code: "PODCAST_APPROVAL_NOT_ALLOWED" });
    const review = await podcastModerationService.assertReviewCanApprove(podcast, adminId, reviewSessionId);
    podcast.approvalStatus = "approved";
    podcast.reviewedBy = adminId;
    podcast.reviewedAt = new Date();
    podcast.rejectReason = null;
    await podcast.save();
    await podcastModerationService.completeReview(review.review, "approved");
    return normalizePodcast((await Podcast.findById(podcast._id).populate(populate)).toObject());
};

const rejectPodcast = async (podcastId, adminId, reason) => {
    const podcast = await findPodcast(podcastId);
    if (podcast.isDeleted) throw new AppError("Deleted podcasts cannot be rejected.", 409, { code: "PODCAST_DELETED" });
    if (podcast.approvalStatus !== "pending") throw new AppError("Only pending podcasts can be rejected.", 409, { code: "PODCAST_REJECTION_NOT_ALLOWED" });
    const normalizedReason = String(reason || "").trim();
    if (!normalizedReason) throw new AppError("Reject reason is required.", 400, { code: "PODCAST_REJECT_REASON_REQUIRED", field: "reason" });
    podcast.approvalStatus = "rejected";
    podcast.reviewedBy = adminId;
    podcast.reviewedAt = new Date();
    podcast.rejectReason = normalizedReason;
    await podcast.save();
    return normalizePodcast((await Podcast.findById(podcast._id).populate(populate)).toObject());
};

const blockPodcast = async (podcastId, adminId, reason) => {
    const podcast = await findPodcast(podcastId);
    const normalizedReason = String(reason || "").trim();
    if (!normalizedReason) throw new AppError("Block reason is required.", 400, { code: "PODCAST_BLOCK_REASON_REQUIRED", field: "reason" });
    podcast.isBlocked = true;
    podcast.blockedReason = normalizedReason;
    podcast.blockedAt = new Date();
    podcast.blockedBy = adminId;
    podcast.visibility = "hidden";
    await podcast.save();
    return normalizePodcast((await Podcast.findById(podcast._id).populate(populate)).toObject());
};

const unblockPodcast = async (podcastId) => {
    const podcast = await findPodcast(podcastId);
    podcast.isBlocked = false;
    podcast.blockedReason = null;
    podcast.blockedAt = null;
    podcast.blockedBy = null;
    await podcast.save();
    return normalizePodcast((await Podcast.findById(podcast._id).populate(populate)).toObject());
};

export default {
    listAdminPodcasts,
    getAdminPodcast,
    approvePodcast,
    rejectPodcast,
    blockPodcast,
    unblockPodcast,
};
