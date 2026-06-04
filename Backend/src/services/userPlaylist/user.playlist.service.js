import Playlist from "../../models/Playlist.js";
import {
    formatUserPlaylist,
    normalizePositiveInteger,
} from "./user.playlist.service.helper.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const getMyPlaylistsByUserId = async (userId, query = {}) => {
    const page = normalizePositiveInteger(query.page, DEFAULT_PAGE);
    const requestedLimit = normalizePositiveInteger(query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;

    const filter = {
        userId,
    };

    const [playlists, total] = await Promise.all([
        Playlist.find(filter)
            .sort({ createdAt: -1, _id: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
                path: "userId",
                select: "profile.fullName",
            })
            .lean(),

        Playlist.countDocuments(filter),
    ]);

    return {
        playlists: playlists.map(formatUserPlaylist),
        pagination: {
            page,
            limit,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
    };
};

export default {
    getMyPlaylistsByUserId,
};