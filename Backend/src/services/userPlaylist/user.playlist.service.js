import Playlist from "../../models/Playlist.js";
import Track from "../../models/Track.js";
import User from "../../models/User.js";
import Subscription from "../../models/Subscription.js";
import mongoose from "mongoose";
import {
    buildCreatePlaylistPayload,
    buildUpdatePlaylistPayload,
    formatCreatedPlaylist,
    formatPlaylistAfterTrackChange,
    formatUpdatedPlaylist,
    formatUserPlaylist,
    formatPlaylistDetail,
    normalizeObjectId,
    normalizePositiveInteger,
} from "./user.playlist.service.helper.js";
import { AppError } from "../../utils/AppError.js";
import { uploadImageBuffer, deleteImageByPublicId } from "../cloudinaryService.js";
import { extractPublicIdFromUrl } from "../../utils/uploadCloud.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const FREE_PLAYLIST_LIMIT = 5;
const FREE_TRACK_LIMIT_PER_PLAYLIST = 10;
const PREMIUM_TRACK_LIMIT_PER_PLAYLIST = 30;

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

const throwPlaylistCreationLimitError = () => {
    throw new AppError(
        "Free users can create up to 5 playlists. Upgrade to premium to create more playlists.",
        403
    );
};

const throwPlaylistTrackLimitError = (isPremium) => {
    const limit = isPremium
        ? PREMIUM_TRACK_LIMIT_PER_PLAYLIST
        : FREE_TRACK_LIMIT_PER_PLAYLIST;
    const message = isPremium
        ? "Premium playlists can contain up to 30 tracks."
        : "Free playlists can contain up to 10 tracks. Upgrade to premium to add more tracks.";

    throw new AppError(message, 403, {
        limit,
        isPremium,
    });
};

const getPlaylistLimitByUserId = async (userId) => {
    const now = new Date();

    const [user, activeSubscription] = await Promise.all([
        User.findById(userId)
            .select("subscription.isPremium subscription.premiumEndDate")
            .lean(),
        Subscription.findOne({
            userId,
            status: "active",
            startDate: { $lte: now },
            endDate: { $gte: now },
        })
            .select("_id")
            .lean(),
    ]);

    const hasActiveSubscription = Boolean(activeSubscription);
    const hasPremiumFlag =
        Boolean(user?.subscription?.isPremium) &&
        Boolean(user?.subscription?.premiumEndDate) &&
        new Date(user.subscription.premiumEndDate) >= now;
    const isPremium = hasActiveSubscription || hasPremiumFlag;

    return {
        isPremium,
        playlistLimit: FREE_PLAYLIST_LIMIT,
        trackLimitPerPlaylist: isPremium
            ? PREMIUM_TRACK_LIMIT_PER_PLAYLIST
            : FREE_TRACK_LIMIT_PER_PLAYLIST,
    };
};

const createMyPlaylistByUserId = async (userId, body = {}, file = null) => {
    if (!userId) {
        throw new AppError("Unauthorized.", 401);
    }

    const { title, description } = buildCreatePlaylistPayload(body);
    const { isPremium, playlistLimit } = await getPlaylistLimitByUserId(userId);

    if (!isPremium) {
        const playlistCount = await Playlist.countDocuments({
            userId,
            type: "user",
        });

        if (playlistCount >= playlistLimit) {
            throwPlaylistCreationLimitError();
        }
    }

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

    const payload = buildUpdatePlaylistPayload(body);
    const hasCoverImageFile = Boolean(file?.buffer);

    if (Object.keys(payload).length === 0 && !hasCoverImageFile) {
        throw new AppError("No changes provided.", 400);
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

const addTrackToMyPlaylistByUserId = async (userId, playlistId, trackId) => {
    if (!userId) {
        throw new AppError("Unauthorized.", 401);
    }

    const normalizedPlaylistId = normalizeObjectId(playlistId, "playlistId");
    const normalizedTrackId = normalizeObjectId(trackId, "trackId");

    const playlist = await Playlist.findOne({
        _id: normalizedPlaylistId,
        userId,
        type: "user",
    });

    if (!playlist) {
        throw new AppError("Playlist not found.", 404);
    }

    const [track, { isPremium, trackLimitPerPlaylist }] = await Promise.all([
        Track.findOne({
            _id: normalizedTrackId,
            activeStatus: "active",
            approvalStatus: "approved",
        }).lean(),
        getPlaylistLimitByUserId(userId),
    ]);

    if (!track) {
        throw new AppError("Track not found or unavailable.", 404);
    }

    const alreadyExists = playlist.tracks.some(
        (item) => String(item.trackId) === String(normalizedTrackId)
    );

    if (alreadyExists) {
        throw new AppError("Track already exists in playlist.", 409, {
            field: "trackId",
        });
    }

    if (playlist.tracks.length >= trackLimitPerPlaylist) {
        throwPlaylistTrackLimitError(isPremium);
    }

    playlist.tracks.push({
        trackId: normalizedTrackId,
        addedAt: new Date(),
        order: playlist.tracks.length,
    });

    playlist.trackCount = playlist.tracks.length;
    playlist.totalDuration =
        Number(playlist.totalDuration || 0) + Number(track.duration || 0);

    await playlist.save();

    return formatPlaylistAfterTrackChange(playlist);
};

const removeTrackFromMyPlaylistByUserId = async (userId, playlistId, trackId) => {
    if (!userId) {
        throw new AppError("Unauthorized.", 401);
    }

    const normalizedPlaylistId = normalizeObjectId(playlistId, "playlistId");
    const normalizedTrackId = normalizeObjectId(trackId, "trackId");

    const playlist = await Playlist.findOne({
        _id: normalizedPlaylistId,
        userId,
        type: "user",
    });

    if (!playlist) {
        throw new AppError("Playlist not found.", 404);
    }

    const existingTrackIndex = playlist.tracks.findIndex(
        (item) => String(item.trackId) === String(normalizedTrackId)
    );

    if (existingTrackIndex === -1) {
        throw new AppError("Track not found in playlist.", 404, {
            field: "trackId",
        });
    }

    playlist.tracks.splice(existingTrackIndex, 1);
    playlist.tracks.forEach((item, index) => {
        item.order = index;
    });

    const remainingTrackIds = playlist.tracks.map((item) => item.trackId);
    let totalDuration = 0;

    if (remainingTrackIds.length > 0) {
        const tracks = await Track.find({
            _id: { $in: remainingTrackIds },
        })
            .select("duration")
            .lean();

        totalDuration = tracks.reduce(
            (sum, track) => sum + Number(track?.duration || 0),
            0
        );
    }

    playlist.trackCount = playlist.tracks.length;
    playlist.totalDuration = totalDuration;
    playlist.markModified("tracks");

    await playlist.save();

    return formatPlaylistAfterTrackChange(playlist);
};

const deleteMyPlaylistByUserId = async (userId, playlistId) => {
    if (!userId) {
        throw new AppError("Unauthorized.", 401);
    }

    assertPlaylistId(playlistId);

    const playlist = await Playlist.findOne({
        _id: playlistId,
        userId,
        type: "user",
    });

    if (!playlist) {
        throw new AppError("Playlist not found.", 404);
    }

    if (playlist.coverImage) {
        const publicId = extractPublicIdFromUrl(playlist.coverImage);

        if (publicId) {
            try {
                await deleteImageByPublicId(publicId, true);
            } catch (error) {
                console.error("[ERROR] Delete user playlist cover failed:", error);
            }
        }
    }

    await Playlist.deleteOne({
        _id: playlistId,
        userId,
        type: "user",
    });
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

const buildPlaylistDetailFilter = (playlistId, mode, currentUserId) => {
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
    addTrackToMyPlaylistByUserId,
    removeTrackFromMyPlaylistByUserId,
    deleteMyPlaylistByUserId,
    getMyPlaylistsByUserId,
    getPlaylistDetail,
};
