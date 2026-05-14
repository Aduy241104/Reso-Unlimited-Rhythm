import mongoose from "mongoose";
import Playlist from "../../models/Playlist.js";
import { AppError } from "../../utils/AppError.js";
import { formatSystemPlaylistSummary } from "./playlist.helper.js";
import playlistService from "./playlist.service.js";

const assertObjectId = (playlistId) => {
    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new AppError("Playlist id is invalid.", 400, {
            field: "playlistId",
        });
    }
};

const findSystemPlaylist = async (playlistId) => {
    assertObjectId(playlistId);
    const doc = await Playlist.findOne({ _id: playlistId, type: "system" });
    if (!doc) {
        throw new AppError("System playlist not found.", 404);
    }
    return doc;
};

const createSystemPlaylist = async (adminUserId, payload) => {
    const playlist = await Playlist.create({
        userId: adminUserId,
        title: payload.title.trim(),
        description: typeof payload.description === "string" ? payload.description.trim() : "",
        type: "system",
        coverImage: typeof payload.coverImage === "string" ? payload.coverImage.trim() : "",
        isPublic: true,
        isHidden: false,
        tracks: [],
        trackCount: 0,
        totalDuration: 0,
    });

    return formatSystemPlaylistSummary(playlist.toObject());
};

const getSystemPlaylistDetailForAdmin = async (playlistId) => {
    return playlistService.getPlaylistDetail(playlistId, { mode: "adminSystem" });
};

const updateSystemPlaylist = async (playlistId, payload) => {
    const playlist = await findSystemPlaylist(playlistId);

    if (payload.title !== undefined) {
        playlist.title = payload.title.trim();
    }
    if (payload.description !== undefined) {
        playlist.description = payload.description.trim();
    }
    if (payload.coverImage !== undefined) {
        playlist.coverImage = typeof payload.coverImage === "string"
            ? payload.coverImage.trim()
            : "";
    }
    if (payload.isPublic !== undefined) {
        playlist.isPublic = Boolean(payload.isPublic);
    }
    if (payload.isHidden !== undefined) {
        playlist.isHidden = Boolean(payload.isHidden);
    }

    await playlist.save();
    return getSystemPlaylistDetailForAdmin(playlistId);
};

const deleteSystemPlaylist = async (playlistId) => {
    await findSystemPlaylist(playlistId);
    await Playlist.deleteOne({ _id: playlistId, type: "system" });
};

export default {
    createSystemPlaylist,
    getSystemPlaylistDetailForAdmin,
    updateSystemPlaylist,
    deleteSystemPlaylist,
};
