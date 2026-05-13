import mongoose from "mongoose";
import Track from "../../models/Track.js";
import Artist from "../../models/Artist.js";
import User from "../../models/User.js";
import { AppError } from "../../utils/AppError.js";
import { formatTrackDetail } from "./track.helper.js";
import { StatusCodes } from "http-status-codes";

const createTrack = async (userId, trackData) => {
    // Verify user exists and is an artist
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

    // Get artist profile linked to user
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

    // Create track
    const newTrack = new Track({
        title: trackData.title,
        artist_artistId: artist._id,
        album_albumId: trackData.album_albumId || null,
        genreIds: trackData.genreIds || [],
        audioFiles: trackData.audioFiles || [],
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

    // Populate and return formatted track
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

    return formatTrackDetail(populatedTrack);
};

export default {
    createTrack,
};
