import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import Artist from "../../models/Artist.js";
import Track from "../../models/Track.js";
import User from "../../models/User.js";
import Album from "../../models/Album.js";
import { AppError } from "../../utils/AppError.js";
import {
    formatTrackDetail,
    formatTrackManagementDetail,
    formatTrackPlayback,
    getPremiumAccessState,
    getValidAudioFiles,
} from "./track.helper.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;

const normalizePositiveInteger = (value, fallback) => {
    const parsedValue = Number.parseInt(value, 10);

    if (Number.isInteger(parsedValue) && parsedValue > 0) {
        return parsedValue;
    }

    return fallback;
};

const createTrack = async (userId, trackData) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new AppError("User not found.", StatusCodes.NOT_FOUND);
    }

    if (user.role !== "artist") {
        throw new AppError(
            "Only artists can create tracks.",
            StatusCodes.FORBIDDEN
        );
    }

    const artist = await Artist.findOne({ userId });

    if (!artist) {
        throw new AppError(
            "Artist profile not found. Please complete your artist profile first.",
            StatusCodes.NOT_FOUND
        );
    }

    if (artist.activeStatus === "blocked") {
        throw new AppError(
            "Your artist account has been blocked. Cannot create tracks.",
            StatusCodes.FORBIDDEN
        );
    }

    const rawAlbumId = trackData.album_albumId;
    const resolvedAlbumId =
        rawAlbumId && String(rawAlbumId).trim() !== ""
            ? String(rawAlbumId).trim()
            : null;

    if (resolvedAlbumId && !mongoose.Types.ObjectId.isValid(resolvedAlbumId)) {
        throw new AppError("Album id is invalid.", StatusCodes.BAD_REQUEST, {
            field: "album_albumId",
        });
    }

    const processedAudioFiles = (trackData.audioFiles || []).map((file) => {
        if (typeof file === "string") {
            return {
                url: file,
                format: "unknown",
                bitrate: 128,
                label: "original",
                priority: 0,
            };
        }

        return {
            url: file.url,
            format: file.format || "unknown",
            bitrate: file.bitrate || 128,
            label: file.label || "original",
            priority: file.priority !== undefined ? file.priority : 0,
        };
    });

    processedAudioFiles.sort((a, b) => b.priority - a.priority);

    const newTrack = new Track({
        title: trackData.title,
        artist_artistId: artist._id,
        album_albumId: resolvedAlbumId,
        genreIds: trackData.genreIds || [],
        audioFiles: processedAudioFiles,
        duration: trackData.duration,
        avatar: trackData.avatar || "",
        coverImage: trackData.coverImage || [],
        lyricsStatic: trackData.lyricsStatic || "",
        lyricsSyncUrl: trackData.lyricsSyncUrl || "",
        releaseDate: trackData.releaseDate || null,
        activeStatus: trackData.activeStatus || "active",
        approvalStatus: "pending",
        stats: {
            totalLike: 0,
            totalPlay: 0,
        },
    });

    const savedTrack = await newTrack.save();

    if (resolvedAlbumId) {
        const album = await Album.findById(resolvedAlbumId);

        if (!album) {
            throw new AppError("Album not found.", StatusCodes.NOT_FOUND);
        }

        if (!album.artistId.equals(artist._id)) {
            throw new AppError(
                "This album does not belong to your artist profile.",
                StatusCodes.FORBIDDEN
            );
        }

        const nextOrder =
            (Array.isArray(album.trackList) ? album.trackList.length : 0) + 1;

        await Album.findByIdAndUpdate(resolvedAlbumId, {
            $push: {
                trackList: {
                    trackId: savedTrack._id,
                    order: nextOrder,
                },
            },
        });
    }

    const populatedTrack = await Track.findById(savedTrack._id)
        .populate({
            path: "artist_artistId",
            select: "name avatar coverImage",
        })
        .populate({
            path: "album_albumId",
            select: "title avatar",
        })
        .populate({
            path: "genreIds",
            select: "name",
        });

    return formatTrackManagementDetail(populatedTrack);
};

const getArtistTracks = async (userId, query = {}) => {
    const artist = await Artist.findOne({ userId });

    if (!artist) {
        throw new AppError("Artist profile not found.", StatusCodes.NOT_FOUND);
    }

    const page = normalizePositiveInteger(query.page, DEFAULT_PAGE);
    const requestedLimit = normalizePositiveInteger(query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, 100);
    const skip = (page - 1) * limit;

    const filter = {
        artist_artistId: artist._id,
    };

    const rawSearch = typeof query.q === "string" ? query.q.trim() : "";
    if (rawSearch) {
        const escapedSearch = rawSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        filter.title = {
            $regex: escapedSearch,
            $options: "i",
        };
    }

    const [tracks, total] = await Promise.all([
        Track.find(filter)
            .sort({ createdAt: -1, _id: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
                path: "artist_artistId",
                select: "name avatar coverImage",
            })
            .populate({
                path: "album_albumId",
                select: "title avatar",
            })
            .populate({
                path: "genreIds",
                select: "name",
            })
            .lean(),
        Track.countDocuments(filter),
    ]);

    return {
        tracks: tracks.map(formatTrackManagementDetail),
        pagination: {
            page,
            limit,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
    };
};

const getTrackDetail = async (trackId) => {
    if (!mongoose.Types.ObjectId.isValid(trackId)) {
        throw new AppError("Track id is invalid.", 400, {
            field: "id",
        });
    }

    const track = await Track.findOne({
        _id: trackId,
        activeStatus: "active",
        approvalStatus: "approved",
    })
        .populate({
            path: "artist_artistId",
            select: "name avatar coverImage",
        })
        .populate({
            path: "album_albumId",
            select: "title coverImage",
        })
        .populate({
            path: "genreIds",
            select: "name image",
        })
        .lean()
        .select("-__v -createdAt -updatedAt -blockedReason -hiddenReason -hiddenAt");

    if (!track) {
        throw new AppError("Track not found.", 404);
    }

    return formatTrackDetail(track);
};

const getTrackPlayback = async (trackId, user) => {
    if (!mongoose.Types.ObjectId.isValid(trackId)) {
        throw new AppError("Track id is invalid.", 400, {
            field: "id",
        });
    }

    const track = await Track.findOne({
        _id: trackId,
        activeStatus: "active",
        approvalStatus: "approved",
    })
        .populate({
            path: "artist_artistId",
            select: "name avatar coverImage",
        })
        .populate({
            path: "album_albumId",
            select: "title coverImage",
        })
        .lean()
        .select("-__v -createdAt -updatedAt");

    if (!track) {
        throw new AppError("Track not found.", 404);
    }

    const validAudioFiles = getValidAudioFiles(track.audioFiles);
    if (!validAudioFiles.length) {
        throw new AppError("Track does not have any audio file.", 404);
    }

    const accessState = await getPremiumAccessState(user);

    return formatTrackPlayback(track, validAudioFiles, accessState);
};

export default {
    createTrack,
    getArtistTracks,
    getTrackDetail,
    getTrackPlayback,
};
