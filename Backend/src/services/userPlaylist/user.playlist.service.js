import Playlist from "../../models/Playlist.js";
import mongoose from "mongoose";
import {
    buildCreatePlaylistPayload,
    buildUpdatePlaylistPayload,
    formatCreatedPlaylist,
    formatUpdatedPlaylist,
    formatUserPlaylist,
    formatPlaylistDetail,
    normalizePositiveInteger,
} from "./user.playlist.service.helper.js";
import { AppError } from "../../utils/AppError.js";
import { uploadImageBuffer } from "../cloudinaryService.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const throwPlaylistValidationError = (error) => {
    if (error instanceof AppError) {
        throw error;
    }

    if (error?.name === "ValidationError") {
        const firstField = Object.keys(error.errors || {})[0] || "playlist";
        throw new AppError("Invalid playlist data.", 400, {
            field: firstField,
        });
    }

    throw error;
};

const uploadPlaylistCoverImage = async (userId, file) => {
    if (!file?.buffer) {
        return "";
    }

    try {
        const uploaded = await uploadImageBuffer({
            buffer: file.buffer,
            folder: "reso/playlists",
            publicId: `user_playlist_${userId}_${Date.now()}`,
        });

        return uploaded?.secure_url || "";
    } catch {
        throw new AppError(
            "Could not upload cover image. Check storage configuration and try again.",
            502
        );
    }
};

const assertPlaylistId = (playlistId) => {
    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new AppError("Playlist id is invalid.", 400, {
            field: "id",
        });
    }
};

const createMyPlaylistByUserId = async (userId, body = {}, file = null) => {
    if (!userId) {
        throw new AppError("Unauthorized.", 401);
    }

    const { title, description } = buildCreatePlaylistPayload(body);
    const coverImage = await uploadPlaylistCoverImage(userId, file);

    try {
        const createdPlaylist = await Playlist.create({
            userId,
            title,
            description,
            coverImage,
            type: "user",
            isPublic: false,
            isHidden: false,
            trackCount: 0,
            totalDuration: 0,
            tracks: [],
        });

        return formatCreatedPlaylist(createdPlaylist);
    } catch (error) {
        throwPlaylistValidationError(error);
    }
};

const updateMyPlaylistByUserId = async (
    userId,
    playlistId,
    body = {},
    file = null
) => {
    if (!userId) {
        throw new AppError("Unauthorized.", 401);
    }

    assertPlaylistId(playlistId);

    const requestBody =
        body && typeof body === "object" && !Array.isArray(body)
            ? body
            : {};
    const payload = buildUpdatePlaylistPayload(requestBody);
    const hasCoverImageFile = Boolean(file?.buffer);

    if (Object.keys(payload).length === 0 && !hasCoverImageFile) {
        throw new AppError(
            "Provide at least one field to update: title, description, or coverImage.",
            400,
            {
                fields: ["title", "description", "coverImage"],
            }
        );
    }

    const playlist = await Playlist.findOne({
        _id: playlistId,
        userId,
        type: "user",
    });

    if (!playlist) {
        throw new AppError("Playlist not found.", 404);
    }

    if (payload.title !== undefined) {
        playlist.title = payload.title;
    }

    if (payload.description !== undefined) {
        playlist.description = payload.description;
    }

    if (hasCoverImageFile) {
        const newCoverImage = await uploadPlaylistCoverImage(userId, file);

        if (newCoverImage) {
            playlist.coverImage = newCoverImage;
        }
    }

    try {
        await playlist.save();
        return formatUpdatedPlaylist(playlist);
    } catch (error) {
        throwPlaylistValidationError(error);
    }
};

const getMyPlaylistsByUserId = async (userId, query = {}) => {
    const page = normalizePositiveInteger(query.page, DEFAULT_PAGE);
    const requestedLimit = normalizePositiveInteger(query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;

    const filter = {
        userId,
    };

    const [playlists, total] = await Promise.all([
        Playlist.find(filter)
            .sort({ createdAt: -1, _id: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
                path: "userId",
                select: "profile.fullName",
            })
            .lean(),

        Playlist.countDocuments(filter),
    ]);

    return {
        playlists: playlists.map(formatUserPlaylist),
        pagination: {
            page,
            limit,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
    };
};


const buildPlaylistDetailFilter = (
    playlistId,
    mode,
    currentUserId
) => {
    if (mode === "adminSystem") {
        return {
            _id: playlistId,
            type: "system",
        };
    }

    return {
        _id: playlistId,
        $or: [
            { type: "system" },

            {
                isHidden: false,
                isPublic: true,
            },

            {
                userId: currentUserId,
            },
        ],
    };
};

const getPlaylistDetail = async (playlistId, options = {}) => {
    const mode = options.mode ?? "public";

    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new AppError("Playlist id is invalid.", 400, {
            field: "id",
        });
    }

    const filter = buildPlaylistDetailFilter(
        playlistId,
        mode,
        options.currentUserId
    );

    const playlist = await Playlist.findOne(filter)
        .populate({
            path: "userId",
            select: "email avatar role profile.fullName",
        })
        .populate({
            path: "tracks.trackId",
            select: [
                "title",
                "duration",
                "avatar",
                "coverImage",
                "audioFiles",
                "lyricsStatic",
                "lyricsSyncUrl",
                "stats",
                "releaseDate",
                "activeStatus",
                "approvalStatus",
                "artist_artistId",
                "album_albumId",
            ].join(" "),
            populate: [
                {
                    path: "artist_artistId",
                    select: "name avatar coverImage",
                },
                {
                    path: "album_albumId",
                    select: "title coverImage",
                },
            ],
        })
        .lean();

    if (!playlist) {
        throw new AppError("Playlist not found.", 404);
    }

    return formatPlaylistDetail(playlist);
};

export default {
    createMyPlaylistByUserId,
    updateMyPlaylistByUserId,
    getMyPlaylistsByUserId,
    getPlaylistDetail,
};
