import mongoose from "mongoose";
import Podcast from "../../models/Podcast.js";
import Artist from "../../models/Artist.js";
import { AppError } from "../../utils/AppError.js";
import { validatePodcastForSubmit } from "./podcast.validation.service.js";

const PAGE = 1;
const LIMIT = 20;

const idOf = (value) => value?._id?.toString?.() || value?.toString?.() || null;
const normalizePage = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizePodcast = (podcast) => {
    if (!podcast) return null;
    const normalized = { ...podcast };
    delete normalized.genre;
    const creator = podcast.creator;
    return {
        ...normalized,
        id: idOf(podcast._id),
        _id: undefined,
        creator: creator && typeof creator === "object"
            ? { id: idOf(creator), name: creator.name || "", avatar: creator.avatar || "" }
            : creator,
    };
};

const findArtistForUser = async (userId) => {
    const artist = await Artist.findOne({ userId, isDeleted: { $ne: true } }).select("_id name avatar");
    if (!artist) throw new AppError("Artist profile is required.", 403, { code: "ARTIST_PROFILE_REQUIRED" });
    return artist;
};

const assertObjectId = (id) => {
    if (!mongoose.isValidObjectId(id)) throw new AppError("Podcast id is invalid.", 400, { field: "id" });
};

const artistQuery = () => [
    { path: "creator", select: "name avatar" },
];

const getOwnedPodcast = async (userId, podcastId, { includeDeleted = false } = {}) => {
    assertObjectId(podcastId);
    const artist = await findArtistForUser(userId);
    const filter = { _id: podcastId, creator: artist._id };
    if (!includeDeleted) filter.isDeleted = { $ne: true };
    const podcast = await Podcast.findOne(filter).populate(artistQuery());
    if (!podcast) throw new AppError("Podcast not found.", 404, { code: "PODCAST_NOT_FOUND" });
    return { artist, podcast };
};

const buildDraftData = (payload = {}) => ({
    title: payload.title ?? "",
    description: payload.description ?? "",
    audioUrl: payload.audioUrl ?? "",
    coverImageUrl: payload.coverImageUrl ?? "",
    duration: payload.duration ?? 0,
    copyrightType: payload.copyrightType || "original",
    copyrightSource: payload.copyrightSource ?? "",
    copyrightProofUrl: payload.copyrightProofUrl ?? "",
    copyrightConfirmed: payload.copyrightConfirmed === true,
});

const createArtistPodcast = async (userId, payload = {}) => {
    const artist = await findArtistForUser(userId);
    const podcast = await Podcast.create({ creator: artist._id, ...buildDraftData(payload) });
    return normalizePodcast(await Podcast.findById(podcast._id).populate(artistQuery()));
};

const listArtistPodcasts = async (userId, query = {}) => {
    const artist = await findArtistForUser(userId);
    const page = normalizePage(query.page, PAGE);
    const limit = Math.min(normalizePage(query.limit, LIMIT), 50);
    const filter = { creator: artist._id };
    if (query.includeDeleted !== true && query.includeDeleted !== "true") filter.isDeleted = { $ne: true };
    if (query.status && query.status !== "all") filter.approvalStatus = query.status;
    const [items, total] = await Promise.all([
        Podcast.find(filter).populate(artistQuery()).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        Podcast.countDocuments(filter),
    ]);
    return {
        podcasts: items.map(normalizePodcast),
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
};

const getArtistPodcast = async (userId, podcastId) => {
    const { podcast } = await getOwnedPodcast(userId, podcastId);
    return normalizePodcast(podcast.toObject ? podcast.toObject() : podcast);
};

const assertEditable = (podcast) => {
    if (["pending", "approved"].includes(podcast.approvalStatus)) {
        throw new AppError("Podcast cannot be edited in its current state.", 409, {
            code: podcast.approvalStatus === "pending" ? "PODCAST_PENDING_LOCKED" : "PODCAST_APPROVED_LOCKED",
        });
    }
};

const updateArtistPodcast = async (userId, podcastId, payload = {}) => {
    const { podcast } = await getOwnedPodcast(userId, podcastId);
    assertEditable(podcast);
    const current = podcast.toObject();
    Object.assign(podcast, buildDraftData({
        ...current,
        ...payload,
    }));
    await podcast.save();
    return normalizePodcast((await Podcast.findById(podcast._id).populate(artistQuery())).toObject());
};

const submitArtistPodcast = async (userId, podcastId) => {
    const { podcast } = await getOwnedPodcast(userId, podcastId);
    if (!["draft", "rejected"].includes(podcast.approvalStatus)) {
        throw new AppError("Only draft or rejected podcasts can be submitted.", 409, { code: "PODCAST_SUBMIT_NOT_ALLOWED" });
    }
    validatePodcastForSubmit(podcast);
    podcast.approvalStatus = "pending";
    podcast.reviewedBy = null;
    podcast.reviewedAt = null;
    podcast.rejectReason = null;
    await podcast.save();
    return normalizePodcast((await Podcast.findById(podcast._id).populate(artistQuery())).toObject());
};

const deleteArtistPodcast = async (userId, podcastId) => {
    const { podcast } = await getOwnedPodcast(userId, podcastId);
    podcast.isDeleted = true;
    podcast.deletedAt = new Date();
    podcast.deletedBy = userId;
    podcast.visibility = "hidden";
    await podcast.save();
    return normalizePodcast(podcast.toObject());
};

const setArtistPodcastVisibility = async (userId, podcastId, visibility) => {
    const { podcast } = await getOwnedPodcast(userId, podcastId);
    if (podcast.approvalStatus !== "approved") throw new AppError("Only approved podcasts can change visibility.", 409, { code: "PODCAST_VISIBILITY_NOT_ALLOWED" });
    if (podcast.isBlocked && visibility === "public") throw new AppError("Blocked podcasts cannot be made public.", 409, { code: "PODCAST_BLOCKED" });
    podcast.visibility = visibility;
    await podcast.save();
    return normalizePodcast(podcast.toObject());
};

export { normalizePodcast, artistQuery, findArtistForUser };

export default {
    createArtistPodcast,
    listArtistPodcasts,
    getArtistPodcast,
    updateArtistPodcast,
    submitArtistPodcast,
    deleteArtistPodcast,
    setArtistPodcastVisibility,
    getOwnedPodcast,
};
