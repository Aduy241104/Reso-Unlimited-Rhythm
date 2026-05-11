import playlistService from "../services/Playlist/playlist.service.js";
import formatResponse from "../utils/formatResponse.js";

const getSystemPlaylists = async (req, res, next) => {
    try {
        const result = await playlistService.getSystemPlaylists(req.query);

        return formatResponse.success(
            res,
            { playlists: result.playlists },
            "System playlists fetched successfully",
            result.pagination
        );
    } catch (error) {
        next(error);
    }
};

const getPlaylistDetail = async (req, res, next) => {
    try {
        const playlist = await playlistService.getPlaylistDetail(req.params.id);

        return formatResponse.success(
            res,
            { playlist },
            "Playlist fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getSystemPlaylists,
    getPlaylistDetail,
};
