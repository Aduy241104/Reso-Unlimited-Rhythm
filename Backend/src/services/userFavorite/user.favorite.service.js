import Interaction from "../../models/Interaction.js";
import { AppError } from "../../utils/AppError.js";
import {
    buildFavoriteTracksFilter,
    buildTrackFavoriteFilter,
    getTrackFavoriteInteraction,
    getTrackOrThrow,
    validateTrackId,
} from "./user.favorite.service.helper.js";

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

    await Interaction.deleteOne(
        buildTrackFavoriteFilter(userId, normalizedTrackId)
    );

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

    const totalItems = await Interaction.countDocuments(filter);

    const interactions = await Interaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
            path: "targetId",
            select: "title avatar coverImage duration artist_artistId album_albumId",
            populate: [
                {
                    path: "artist_artistId",
                    select: "artistName name profile.fullName avatar",
                },
                {
                    path: "album_albumId",
                    select: "title coverImage",
                },
            ],
        })
        .lean();

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
                album: album
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
