import mongoose from "mongoose";
import Podcast from "../../models/Podcast.js";
import Artist from "../../models/Artist.js";
import { AppError } from "../../utils/AppError.js";
import { publicArtistMatch } from "../artist/artist.status.helper.js";
import { normalizePodcast } from "./podcast.service.js";

const publicFilter = () => ({
    approvalStatus: "approved",
    visibility: "public",
    isBlocked: false,
    isDeleted: { $ne: true },
});

const pagination = (query = {}) => {
    const pageValue = Number.parseInt(query.page, 10);
    const limitValue = Number.parseInt(query.limit, 10);
    const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
    const limit = Number.isInteger(limitValue) && limitValue > 0 ? Math.min(limitValue, 50) : 20;
    return { page, limit };
};

const buildPublicPodcastPipeline = (query = {}) => {
    const pipeline = [
        { $match: publicFilter() },
        {
            $lookup: {
                from: Artist.collection.name,
                localField: "creator",
                foreignField: "_id",
                as: "creator",
            },
        },
        { $unwind: "$creator" },
        {
            $match: {
                "creator.activeStatus": publicArtistMatch.activeStatus,
                "creator.isDeleted": publicArtistMatch.isDeleted,
            },
        },
    ];

    if (query.q?.trim()) {
        const regex = new RegExp(query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        pipeline.push({
            $match: {
                $or: [{ title: regex }, { "creator.name": regex }],
            },
        });
    }

    return pipeline;
};

const listPublicPodcasts = async (query = {}) => {
    const { page, limit } = pagination(query);
    const [result] = await Podcast.aggregate([
        ...buildPublicPodcastPipeline(query),
        { $sort: { createdAt: -1 } },
        {
            $facet: {
                items: [
                    { $skip: (page - 1) * limit },
                    { $limit: limit },
                ],
                meta: [{ $count: "total" }],
            },
        },
    ]);
    const items = result?.items || [];
    const total = result?.meta?.[0]?.total || 0;
    return {
        podcasts: items.map(normalizePodcast),
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
};

const getPublicPodcast = async (podcastId) => {
    if (!mongoose.isValidObjectId(podcastId)) throw new AppError("Podcast not found.", 404, { code: "PODCAST_NOT_FOUND" });
    const podcast = await Podcast.findOne({ _id: podcastId, ...publicFilter() })
        .populate({ path: "creator", match: publicArtistMatch, select: "name avatar" })
        .lean();
    if (!podcast || !podcast.creator) throw new AppError("Podcast not found.", 404, { code: "PODCAST_NOT_FOUND" });
    return normalizePodcast(podcast);
};

export { publicFilter, listPublicPodcasts, getPublicPodcast };
