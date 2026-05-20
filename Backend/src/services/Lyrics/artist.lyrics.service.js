import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import Artist from "../../models/Artist.js";
import Track from "../../models/Track.js";
import User from "../../models/User.js";
import { AppError } from "../../utils/AppError.js";
import { formatTrackManagementDetail } from "../Track/track.helper.js";
import { uploadToCloudinary } from "../../utils/uploadCloud.js";
import fs from "fs/promises";
import path from "path";

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

const updateSyncLyrics = async (userId, trackId, lyricsFile) => {
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

    if (!lyricsFile || !lyricsFile.buffer) {
        throw new AppError("No lyrics file provided.", StatusCodes.BAD_REQUEST);
    }

    const uploadResult = await uploadToCloudinary(
        lyricsFile.buffer,
        "tracks/lyrics/sync",
        "raw"
    );

    track.lyricsSyncUrl = uploadResult.secure_url || "";

    // Also save a local copy into Backend/public/lyrics for quick access
    try {
        const publicDir = path.resolve(process.cwd(), "public", "lyrics");
        await fs.mkdir(publicDir, { recursive: true });

        const rawTitle = String(track.title || "synced-lyrics");
        const titleSlug = rawTitle
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9._-]+/g, "_")
            .replace(/^_+|_+$/g, "")
            .slice(0, 120) || "synced-lyrics";

        const localFileName = `${Date.now()}-${track._id}-${titleSlug}.lrc`;
        const localPath = path.join(publicDir, localFileName);

        await fs.writeFile(localPath, lyricsFile.buffer);
    } catch (err) {
        // Non-fatal: log and continue (Cloudinary upload already succeeded)
        console.error("Failed to save synced lyrics to public folder:", err.message || err);
    }

    if (track.approvalStatus === "approved" || track.approvalStatus === "rejected") {
        track.approvalStatus = "pending";
    }

    await track.save();

    const populatedTrack = await populateManagementTrack(track._id);

    return formatTrackManagementDetail(populatedTrack);
};

export default {
    addStaticLyrics,
    updateSyncLyrics,
};
