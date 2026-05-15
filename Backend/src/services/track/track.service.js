import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import Artist from "../../models/Artist.js";
import Track from "../../models/Track.js";
import User from "../../models/User.js";
import { AppError } from "../../utils/AppError.js";
import {
    formatTrackDetail,
    formatTrackManagementDetail,
    formatTrackPlayback,
    getPremiumAccessState,
    getValidAudioFiles,
} from "./track.helper.js";

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
        album_albumId: trackData.album_albumId || null,
        genreIds: trackData.genreIds || [],
        audioFiles: processedAudioFiles,
        duration: trackData.duration,
        avatar: trackData.avatar || "",
        coverImage: trackData.coverImage || [],
        lyricsStatic: trackData.lyricsStatic || "",
        lyricsSyncUrl: trackData.lyricsSyncUrl || "",
        releaseDate: trackData.releaseDate || null,
        activeStatus: trackData.activeStatus || "draft",
        approvalStatus: "pending",
        stats: {
            totalLike: 0,
            totalPlay: 0,
        },
    });

    const savedTrack = await newTrack.save();

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
    getTrackDetail,
    getTrackPlayback,
};
