import Interaction from "../../models/Interaction.js";
import {
    formatFollowedAlbum,
    formatFollowedArtist,
    normalizePositiveInteger,
} from "./libary.service.helper.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const getMyFollowedArtistsByUserId = async (userId, query = {}) => {
    const page = normalizePositiveInteger(query.page, DEFAULT_PAGE);
    const requestedLimit = normalizePositiveInteger(query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;

    const filter = {
        userId,
        targetType: "Artist",
        action: "follow",
    };

    const [interactions, total] = await Promise.all([
        Interaction.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
                path: "targetId",
                select: "name avatar activeStatus",
                match: { activeStatus: "active" },
            })
            .lean(),
        Interaction.countDocuments(filter),
    ]);

    return {
        artists: interactions.map(formatFollowedArtist).filter(Boolean),
        pagination: {
            page,
            limit,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
    };
};

const getMyFollowedAlbumsByUserId = async (userId, query = {}) => {
    const page = normalizePositiveInteger(query.page, DEFAULT_PAGE);
    const requestedLimit = normalizePositiveInteger(query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;

    const filter = {
        userId,
        targetType: "Album",
        action: "follow",
    };

    const [aggregationResult] = await Interaction.aggregate([
        { $match: filter },
        { $sort: { createdAt: -1, _id: -1 } },
        {
            $lookup: {
                from: "albums",
                localField: "targetId",
                foreignField: "_id",
                as: "album",
            },
        },
        { $unwind: "$album" },
        { $match: { "album.status": "active" } },
        {
            $facet: {
                interactions: [
                    { $skip: skip },
                    { $limit: limit },
                    {
                        $lookup: {
                            from: "artists",
                            localField: "album.artistId",
                            foreignField: "_id",
                            as: "artist",
                        },
                    },
                    {
                        $unwind: {
                            path: "$artist",
                            preserveNullAndEmptyArrays: true,
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            targetId: {
                                _id: "$album._id",
                                title: "$album.title",
                                coverImage: "$album.coverImage",
                                trackList: "$album.trackList",
                                artistId: {
                                    name: "$artist.name",
                                },
                            },
                        },
                    },
                ],
                totalCount: [{ $count: "total" }],
            },
        },
    ]);

    const interactions = aggregationResult?.interactions || [];
    const total = aggregationResult?.totalCount?.[0]?.total || 0;

    if (interactions.length === 0) {
        return {
            albums: [],
            pagination: {
                page,
                limit,
                total,
                totalPages: total === 0 ? 0 : Math.ceil(total / limit),
            },
        };
    }

    return {
        albums: interactions.map(formatFollowedAlbum).filter(Boolean),
        pagination: {
            page,
            limit,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
    };
};

export default {
    getMyFollowedArtistsByUserId,
    getMyFollowedAlbumsByUserId,
};
