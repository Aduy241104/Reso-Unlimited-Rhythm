import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import Artist from "../../models/Artist.js";
import Track from "../../models/Track.js";
import User from "../../models/User.js";
import { AppError } from "../../utils/AppError.js";
import { formatTrackManagementDetail } from "../Track/track.helper.js";

const populateManagementTrack = (trackId) =>
    Track.findById(trackId)
        .populate({ path: "artist_artistId", select: "name avatar coverImage" })
        .populate({ path: "album_albumId", select: "title avatar" })
        .populate({ path: "genreIds", select: "name" });

const addStaticLyrics = async (userId, trackId, lyricsStatic) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new AppError("User not found.", StatusCodes.NOT_FOUND);
    }

    if (user.role !== "artist") {
        throw new AppError("Only artists can update lyrics.", StatusCodes.FORBIDDEN);
    }

    const artist = await Artist.findOne({ userId });

    if (!artist) {
        throw new AppError("Artist profile not found.", StatusCodes.NOT_FOUND);
    }

    if (!mongoose.Types.ObjectId.isValid(trackId)) {
        throw new AppError("Track id is invalid.", StatusCodes.BAD_REQUEST, { field: "id" });
    }

    const track = await Track.findOne({ _id: trackId, artist_artistId: artist._id });

    if (!track) {
        throw new AppError("Track not found or you do not have permission to update it.", StatusCodes.NOT_FOUND);
    }

    track.lyricsStatic = lyricsStatic || "";

    if (track.approvalStatus === "approved" || track.approvalStatus === "rejected") {
        track.approvalStatus = "pending";
    }

    await track.save();

    const populatedTrack = await populateManagementTrack(track._id);

    return formatTrackManagementDetail(populatedTrack);
};

export default {
    addStaticLyrics,
};
