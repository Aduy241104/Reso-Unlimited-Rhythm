import Playlist from "../../models/Playlist.js";
import { formatSystemPlaylistSummary } from "./playlist.helper.js";

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

export default {
    createSystemPlaylist,
};
