import { AppError } from "../../utils/AppError.js";
import mongoose from "mongoose";
import {
    resolveTrackReleasedAt,
    resolveTrackReleaseStatus,
} from "../../utils/trackRelease.js";

export const normalizePositiveInteger = (value, defaultValue) => {
    const number = Number(value);

    if (!Number.isInteger(number) || number <= 0) {
        return defaultValue;
    }

    return number;
};

export const normalizeObjectId = (value, field) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new AppError(`${field} is invalid.`, 400, {
            field,
        });
    }

    return value;
};

export const sanitizeString = (value, field) => {
    if (value === undefined || value === null) {
        return "";
    }

    if (typeof value !== "string") {
        throw new AppError(`${field} must be a string.`, 400, {
            field,
        });
    }

    return value.trim();
};

export const buildCreatePlaylistPayload = (body = {}) => {
    const title = sanitizeString(body.title, "title");
    const description = sanitizeString(body.description, "description");

    if (!title) {
        throw new AppError("Title is required.", 400, {
            field: "title",
        });
    }

    if (title.length > 100) {
        throw new AppError("Title must not exceed 100 characters.", 400, {
            field: "title",
        });
    }

    if (description.length > 1000) {
        throw new AppError("Description must not exceed 1000 characters.", 400, {
            field: "description",
        });
    }

    return {
        title,
        description,
    };
};

export const buildUpdatePlaylistPayload = (body = {}) => {
    const payload = {};

    if (body.title !== undefined) {
        const title = sanitizeString(body.title, "title");

        if (!title) {
            throw new AppError("Title is required.", 400, {
                field: "title",
            });
        }

        if (title.length > 100) {
            throw new AppError("Title must not exceed 100 characters.", 400, {
                field: "title",
            });
        }

        payload.title = title;
    }

    if (body.description !== undefined) {
        const description = sanitizeString(body.description, "description");

        if (description.length > 1000) {
            throw new AppError("Description must not exceed 1000 characters.", 400, {
                field: "description",
            });
        }

        payload.description = description;
    }

    return payload;
};

export const formatCreatedPlaylist = (playlist) => {
    return {
        playlistId: playlist._id?.toString?.() || "",
        title: playlist.title,
        description: playlist.description || "",
        coverImage: playlist.coverImage || "",
        type: playlist.type,
        isPublic: playlist.isPublic,
        isHidden: playlist.isHidden,
        isLockedByPlan: Boolean(playlist.isLockedByPlan),
        trackCount: playlist.trackCount,
        totalDuration: playlist.totalDuration,
        createdAt: playlist.createdAt,
    };
};

export const formatUpdatedPlaylist = (playlist) => {
    return formatCreatedPlaylist(playlist);
};

export const formatPlaylistAfterTrackChange = (playlist) => {
    return {
        playlistId: playlist._id?.toString?.() || "",
        title: playlist.title,
        description: playlist.description || "",
        coverImage: playlist.coverImage || "",
        type: playlist.type,
        isLockedByPlan: Boolean(playlist.isLockedByPlan),
        trackCount: playlist.trackCount || 0,
        totalDuration: playlist.totalDuration || 0,
        tracks: (playlist.tracks || []).map((track) => ({
            trackId: track.trackId?.toString?.() || "",
            addedAt: track.addedAt,
            order: track.order,
        })),
    };
};

export const formatUserPlaylist = (playlist) => {
    return {
        playlistId: playlist._id?.toString?.() || "",
        title: playlist.title,
        description: playlist.description || "",
        coverImage: playlist.coverImage || "",
        totalTracks: Array.isArray(playlist.tracks)
            ? playlist.tracks.length
            : playlist.trackCount || 0,
        userName: playlist.userId?.profile?.fullName || "",
        type: playlist.type,
        isPublic: playlist.isPublic,
        isHidden: playlist.isHidden,
        isLockedByPlan: Boolean(playlist.isLockedByPlan),
        createdAt: playlist.createdAt,
    };
};

const toId = (value) => {
    if (!value) {
        return "";
    }

    return value.toString();
};

const getTrackCoverImage = (track) => {
    if (Array.isArray(track.coverImage)) {
        return track.coverImage[0] || "";
    }

    return track.coverImage || track.avatar || "";
};

const isBlockedTrack = (track) => track?.activeStatus === "blocked";
const isActiveTrack = (track) => track?.activeStatus === "active";

const formatPlaylistTrack = (playlistTrack) => {
    const track = playlistTrack.trackId;

    if (!track) {
        return null;
    }

    return {
        order: playlistTrack.order,
        addedAt: playlistTrack.addedAt,
        trackId: toId(track._id),
        track: {
            id: toId(track._id),
            title: track.title || "",
            versionTitle: track.versionTitle || "",
            duration: track.duration || 0,
            coverImage: getTrackCoverImage(track),
            avatar: track.avatar || "",
            audioFiles: track.audioFiles || [],
            lyricsStatic: track.lyricsStatic || "",
            lyricsSyncUrl: track.lyricsSyncUrl || "",
            stats: track.stats || {},
            releaseDate: track.releaseDate,
            releaseStatus: resolveTrackReleaseStatus(track),
            releasedAt: resolveTrackReleasedAt(track),
            activeStatus: track.activeStatus,
            approvalStatus: track.approvalStatus,
            isBlocked: isBlockedTrack(track),
            artist: track.artist_artistId
                ? {
                    id: toId(track.artist_artistId._id),
                    name: track.artist_artistId.name || "",
                    avatar: track.artist_artistId.avatar || "",
                    coverImage: track.artist_artistId.coverImage || "",
                }
                : null,
            album: track.album_albumId
                ? {
                    id: toId(track.album_albumId._id),
                    title: track.album_albumId.title || "",
                    coverImage: track.album_albumId.coverImage || "",
                }
                : null,
        },
    };
};

const buildPlaylistTrackVisibility = (playlist) => {
    const sortedActiveTracks = (playlist.tracks || [])
        .sort((firstTrack, secondTrack) => firstTrack.order - secondTrack.order)
        .filter((playlistTrack) => isActiveTrack(playlistTrack?.trackId))
        .map(formatPlaylistTrack)
        .filter(Boolean);

    const rawTrackLimit = Number(playlist.trackLimit);
    const hasTrackLimit =
        Number.isInteger(rawTrackLimit) && rawTrackLimit > 0;
    const limitedTracks = hasTrackLimit
        ? sortedActiveTracks.slice(0, rawTrackLimit)
        : sortedActiveTracks;
    const visibleTracks = limitedTracks.map((track, index) => ({
        ...track,
        order: index + 1,
    }));
    const trackCount = sortedActiveTracks.length;
    const visibleTrackCount = visibleTracks.length;
    const trackLimit = hasTrackLimit ? rawTrackLimit : null;
    const totalDuration = sortedActiveTracks.reduce(
        (sum, item) => sum + Number(item?.track?.duration || 0),
        0
    );
    const visibleTotalDuration = visibleTracks.reduce(
        (sum, item) => sum + Number(item?.track?.duration || 0),
        0
    );

    return {
        trackCount,
        visibleTrackCount,
        trackLimit,
        totalDuration,
        visibleTotalDuration,
        isTrackLimitedByPlan:
            Boolean(playlist.isTrackLimitedByPlan) ||
            (hasTrackLimit && visibleTrackCount < trackCount),
        visibleTracks,
    };
};

export const formatPlaylistDetail = (playlist) => {
    const {
        trackCount,
        visibleTrackCount,
        trackLimit,
        totalDuration,
        visibleTotalDuration,
        isTrackLimitedByPlan,
        visibleTracks,
    } = buildPlaylistTrackVisibility(playlist);

    return {
        id: toId(playlist._id),
        title: playlist.title,
        description: playlist.description || "",
        type: playlist.type,
        coverImage: playlist.coverImage || "",
        isPublic: playlist.isPublic,
        isHidden: playlist.isHidden,
        isLockedByPlan: Boolean(playlist.isLockedByPlan),
        trackCount,
        visibleTrackCount,
        trackLimit,
        isTrackLimitedByPlan,
        totalDuration,
        visibleTotalDuration,
        aiPrompt: playlist.aiPrompt || "",
        aiGeneratedAt: playlist.aiGeneratedAt,
        owner: playlist.userId
            ? {
                id: toId(playlist.userId._id),
                email: playlist.userId.email || "",
                fullName: playlist.userId.profile?.fullName || "",
                avatar: playlist.userId.avatar || "",
                role: playlist.userId.role,
            }
            : null,
        tracks: visibleTracks,
        createdAt: playlist.createdAt,
        updatedAt: playlist.updatedAt,
    };
};

