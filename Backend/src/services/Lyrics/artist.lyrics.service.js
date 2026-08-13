import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import Artist from "../../models/Artist.js";
import Track from "../../models/Track.js";
import User from "../../models/User.js";
import { AppError } from "../../utils/AppError.js";
import artistTrackService from "../track/artist/artist.track.service.js";
import { assertArtistCanCreateTrack } from "../track/track.draft.validation.js";
import { assertTrackEditableByArtist } from "../track/track.submit.validation.js";
import { uploadToCloudinary } from "../../utils/uploadCloud.js";
import fs from "fs/promises";
import path from "path";

const updateLyricsThroughTrackWorkflow = async (userId, track, payload) => {
    const updatedTrack = await artistTrackService.updateArtistTrack(
        userId,
        track._id,
        payload
    );

    if (track.approvalStatus === "rejected") {
        return artistTrackService.submitArtistTrack(userId, track._id);
    }

    return updatedTrack;
};

const addStaticLyrics = async (userId, trackId, lyricsStatic) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new AppError("Không tìm thấy người dùng.", StatusCodes.NOT_FOUND);
    }

    if (user.role !== "artist") {
        throw new AppError("Chỉ nghệ sĩ mới có thể cập nhật lời bài hát.", StatusCodes.FORBIDDEN);
    }

    const artist = await Artist.findOne({ userId });

    if (!artist) {
        throw new AppError("Không tìm thấy hồ sơ nghệ sĩ.", StatusCodes.NOT_FOUND);
    }

    if (!mongoose.Types.ObjectId.isValid(trackId)) {
        throw new AppError("Mã bài hát không hợp lệ.", StatusCodes.BAD_REQUEST, { field: "id" });
    }

    const track = await Track.findOne({ _id: trackId, artist_artistId: artist._id });

    if (!track) {
        throw new AppError("Không tìm thấy bài hát hoặc bạn không có quyền cập nhật bài hát này.", StatusCodes.NOT_FOUND);
    }

    return updateLyricsThroughTrackWorkflow(userId, track, {
        lyricsStatic: lyricsStatic || "",
    });
};

const updateSyncLyrics = async (userId, trackId, lyricsFile) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new AppError("Không tìm thấy người dùng.", StatusCodes.NOT_FOUND);
    }

    if (user.role !== "artist") {
        throw new AppError("Chỉ nghệ sĩ mới có thể cập nhật lời bài hát.", StatusCodes.FORBIDDEN);
    }

    const artist = await Artist.findOne({ userId });

    if (!artist) {
        throw new AppError("Không tìm thấy hồ sơ nghệ sĩ.", StatusCodes.NOT_FOUND);
    }

    if (!mongoose.Types.ObjectId.isValid(trackId)) {
        throw new AppError("Mã bài hát không hợp lệ.", StatusCodes.BAD_REQUEST, { field: "id" });
    }

    const track = await Track.findOne({ _id: trackId, artist_artistId: artist._id });

    if (!track) {
        throw new AppError("Không tìm thấy bài hát hoặc bạn không có quyền cập nhật bài hát này.", StatusCodes.NOT_FOUND);
    }

    if (!lyricsFile || !lyricsFile.buffer) {
        throw new AppError("Chưa cung cấp tệp lời bài hát.", StatusCodes.BAD_REQUEST);
    }

    assertArtistCanCreateTrack(artist);
    assertTrackEditableByArtist(track);

    const uploadResult = await uploadToCloudinary(
        lyricsFile.buffer,
        "tracks/lyrics/sync",
        "raw"
    );

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

    return updateLyricsThroughTrackWorkflow(userId, track, {
        lyricsSyncUrl: uploadResult.secure_url || "",
    });
};

export default {
    addStaticLyrics,
    updateSyncLyrics,
};
