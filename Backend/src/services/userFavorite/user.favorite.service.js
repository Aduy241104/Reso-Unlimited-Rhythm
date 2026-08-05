import Interaction from "../../models/Interaction.js";
import Track from "../../models/Track.js";
import { AppError } from "../../utils/AppError.js";
import {
    buildFavoriteTracksFilter,
    buildTrackFavoriteFilter,
    getTrackFavoriteInteraction,
    getTrackOrThrow,
    validateTrackId,
} from "./user.favorite.service.helper.js";

const incrementTrackFavoriteCount = async (trackId) => {
    await Track.updateOne(
        { _id: trackId },
        {
            $inc: {
                "stats.totalLike": 1,
            },
        }
    );
};

const decrementTrackFavoriteCount = async (trackId) => {
    await Track.updateOne(
        {
            _id: trackId,
            "stats.totalLike": { $gt: 0 },
        },
        {
            $inc: {
                "stats.totalLike": -1,
            },
        }
    );
};

const addTrackToFavorite = async (userId, trackId) => {
    if (!userId) {
        throw new AppError("Unauthorized.", 401);
    }

    const normalizedTrackId = validateTrackId(trackId);

    await getTrackOrThrow(normalizedTrackId);

    const existingInteraction = await getTrackFavoriteInteraction(
        userId,
        normalizedTrackId
    );

    if (existingInteraction) {
        return {
            isFavorite: true,
        };
    }

    try {
        await Interaction.create(buildTrackFavoriteFilter(userId, normalizedTrackId));
        await incrementTrackFavoriteCount(normalizedTrackId);
    } catch (error) {
        if (error?.code === 11000) {
            return {
                isFavorite: true,
            };
        }

        throw error;
    }

    return {
        isFavorite: true,
    };
};

const removeTrackFromFavorite = async (userId, trackId) => {
    if (!userId) {
        throw new AppError("Unauthorized.", 401);
    }

    const normalizedTrackId = validateTrackId(trackId);

    await getTrackOrThrow(normalizedTrackId);

    const deleteResult = await Interaction.deleteOne(
        buildTrackFavoriteFilter(userId, normalizedTrackId)
    );

    if (deleteResult?.deletedCount > 0) {
        await decrementTrackFavoriteCount(normalizedTrackId);
    }

    return {
        isFavorite: false,
    };
};

const getTrackFavoriteStatus = async (userId, trackId) => {
    if (!userId) {
        throw new AppError("Unauthorized.", 401);
    }

    const normalizedTrackId = validateTrackId(trackId);

    const existingInteraction = await getTrackFavoriteInteraction(
        userId,
        normalizedTrackId
    );

    return {
        isFavorite: Boolean(existingInteraction),
    };
};

const getFavoriteTracks = async (userId, options = {}) => {
    if (!userId) {
        throw new AppError("Unauthorized.", 401);
    }

    const page = Math.max(Number(options.page) || 1, 1);
    const limit = Math.min(
        Math.max(Number(options.limit) || 20, 1),
        50
    );
    const skip = (page - 1) * limit;
    const filter = buildFavoriteTracksFilter(userId);

    const [aggregationResult] = await Interaction.aggregate([
        { $match: filter },
        { $sort: { createdAt: -1, _id: -1 } },
        {
            $lookup: {
                from: "tracks",
                localField: "targetId",
                foreignField: "_id",
                as: "track",
            },
        },
        { $unwind: "$track" },
        { $match: { "track.activeStatus": "active" } },
        {
            $facet: {
                interactions: [
                    { $skip: skip },
                    { $limit: limit },
                    {
                        $lookup: {
                            from: "artists",
                            localField: "track.artist_artistId",
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
                        $lookup: {
                            from: "albums",
                            localField: "track.album_albumId",
                            foreignField: "_id",
                            as: "album",
                        },
                    },
                    {
                        $unwind: {
                            path: "$album",
                            preserveNullAndEmptyArrays: true,
                        },
                    },
                    {
                        $project: {
                            createdAt: 1,
                            targetId: {
                                _id: "$track._id",
                                title: "$track.title",
                                avatar: "$track.avatar",
                                coverImage: "$track.coverImage",
                                duration: "$track.duration",
                                artist_artistId: {
                                    _id: "$artist._id",
                                    artistName: "$artist.artistName",
                                    name: "$artist.name",
                                    profile: {
                                        fullName: "$artist.profile.fullName",
                                    },
                                },
                                album_albumId: {
                                    _id: "$album._id",
                                    title: "$album.title",
                                    coverImage: "$album.coverImage",
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
    const totalItems = aggregationResult?.totalCount?.[0]?.total || 0;

    const items = interactions
        .map((interaction) => {
            const track = interaction.targetId;

            if (!track) {
                return null;
            }

            const artist = track.artist_artistId;
            const album = track.album_albumId;
            const avatar = track.avatar || (
                Array.isArray(track.coverImage) ? track.coverImage[0] : ""
            ) || "";

            return {
                id: track._id.toString(),
                title: track.title,
                avatar,
                duration: track.duration,
                favoritedAt: interaction.createdAt,
                artist: {
                    id: artist?._id?.toString?.() || "",
                    name: artist?.artistName || artist?.name || artist?.profile?.fullName || "",
                },
                album: album?._id
                    ? {
                        id: album._id.toString(),
                        title: album.title || "",
                    }
                    : null,
            };
        })
        .filter(Boolean);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);

    return {
        items,
        pagination: {
            page,
            limit,
            totalItems,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
        },
    };
};

export {
    addTrackToFavorite,
    removeTrackFromFavorite,
    getTrackFavoriteStatus,
    getFavoriteTracks,
};

export default {
    addTrackToFavorite,
    removeTrackFromFavorite,
    getTrackFavoriteStatus,
    getFavoriteTracks,
};
