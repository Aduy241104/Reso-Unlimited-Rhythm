import mongoose from "mongoose";
import Playlist from "../../models/Playlist.js";
import Track from "../../models/Track.js";
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

const syncPlaylistTrackAggregates = async (playlist) => {
    const entries = playlist.tracks || [];
    entries.sort((first, second) => first.order - second.order);
    entries.forEach((entry, index) => {
        entry.order = index;
    });

    if (entries.length === 0) {
        playlist.trackCount = 0;
        playlist.totalDuration = 0;
        return;
    }

    const ids = entries.map((entry) => entry.trackId);
    const found = await Track.find({ _id: { $in: ids } }).select("duration").lean();
    const durationById = new Map(
        found.map((doc) => [doc._id.toString(), Number(doc.duration) || 0])
    );

    playlist.trackCount = entries.length;
    playlist.totalDuration = entries.reduce(
        (sum, entry) => sum + (durationById.get(String(entry.trackId)) || 0),
        0
    );
};

const addTrackToSystemPlaylist = async (playlistId, trackId) => {
    if (!mongoose.Types.ObjectId.isValid(trackId)) {
        throw new AppError("Track id is invalid.", 400, { field: "trackId" });
    }

    const track = await Track.findById(trackId).select("_id").lean();
    if (!track) {
        throw new AppError("Track not found.", 404, { field: "trackId" });
    }

    const playlist = await findSystemPlaylist(playlistId);
    const trackIdStr = String(trackId);

    const alreadyIn = playlist.tracks.some(
        (entry) => String(entry.trackId) === trackIdStr
    );
    if (alreadyIn) {
        throw new AppError("Track is already in this playlist.", 409, {
            field: "trackId",
        });
    }

    const nextOrder = playlist.tracks.length === 0
        ? 0
        : Math.max(...playlist.tracks.map((entry) => entry.order), -1) + 1;

    playlist.tracks.push({
        trackId,
        order: nextOrder,
        addedAt: new Date(),
    });
    playlist.markModified("tracks");

    await syncPlaylistTrackAggregates(playlist);
    await playlist.save();

    return getSystemPlaylistDetailForAdmin(playlistId);
};

const removeTrackFromSystemPlaylist = async (playlistId, trackId) => {
    if (!mongoose.Types.ObjectId.isValid(trackId)) {
        throw new AppError("Track id is invalid.", 400, { field: "trackId" });
    }

    const playlist = await findSystemPlaylist(playlistId);
    const trackIdStr = String(trackId);

    const before = playlist.tracks.length;
    playlist.tracks = playlist.tracks.filter(
        (entry) => String(entry.trackId) !== trackIdStr
    );

    if (playlist.tracks.length === before) {
        throw new AppError("Track is not in this playlist.", 404, {
            field: "trackId",
        });
    }

    playlist.markModified("tracks");
    await syncPlaylistTrackAggregates(playlist);
    await playlist.save();

    return getSystemPlaylistDetailForAdmin(playlistId);
};

const addTracksToSystemPlaylistBatch = async (playlistId, trackIds) => {
    if (!Array.isArray(trackIds) || trackIds.length === 0) {
        throw new AppError("trackIds must be a non-empty array.", 400, {
            field: "trackIds",
        });
    }

    const uniqueOrdered = [];
    const seen = new Set();
    for (const raw of trackIds) {
        const idStr = String(raw).trim();
        if (!mongoose.Types.ObjectId.isValid(idStr) || seen.has(idStr)) {
            continue;
        }
        seen.add(idStr);
        uniqueOrdered.push(idStr);
    }

    if (uniqueOrdered.length === 0) {
        throw new AppError("No valid track ids.", 400, { field: "trackIds" });
    }

    const objectIds = uniqueOrdered.map((id) => new mongoose.Types.ObjectId(id));
    const foundDocs = await Track.find({ _id: { $in: objectIds } }).select("_id").lean();
    const foundSet = new Set(foundDocs.map((doc) => doc._id.toString()));

    const playlist = await findSystemPlaylist(playlistId);
    const inPlaylist = new Set(playlist.tracks.map((entry) => String(entry.trackId)));

    const addedAt = new Date();
    let nextOrder = playlist.tracks.length === 0
        ? 0
        : Math.max(...playlist.tracks.map((entry) => entry.order), -1) + 1;

    let addedCount = 0;
    for (const idStr of uniqueOrdered) {
        if (!foundSet.has(idStr) || inPlaylist.has(idStr)) {
            continue;
        }
        inPlaylist.add(idStr);
        playlist.tracks.push({
            trackId: new mongoose.Types.ObjectId(idStr),
            order: nextOrder,
            addedAt,
        });
        nextOrder += 1;
        addedCount += 1;
    }

    if (addedCount === 0) {
        throw new AppError(
            "No new tracks were added (missing tracks or already in playlist).",
            400,
            { field: "trackIds" }
        );
    }

    playlist.markModified("tracks");
    await syncPlaylistTrackAggregates(playlist);
    await playlist.save();

    const playlistDetail = await getSystemPlaylistDetailForAdmin(playlistId);

    return { playlist: playlistDetail, addedCount };
};

export default {
    createSystemPlaylist,
    getSystemPlaylistDetailForAdmin,
    updateSystemPlaylist,
    deleteSystemPlaylist,
    addTrackToSystemPlaylist,
    removeTrackFromSystemPlaylist,
    addTracksToSystemPlaylistBatch,
};
