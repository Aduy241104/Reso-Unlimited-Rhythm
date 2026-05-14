import adminPlaylistService from "../services/Playlist/admin.playlist.service.js";
import formatResponse from "../utils/formatResponse.js";

const createSystemPlaylist = async (req, res, next) => {
    try {
        const playlist = await adminPlaylistService.createSystemPlaylist(req.user.id, req.body);

        return formatResponse.success(
            res,
            { playlist },
            "System playlist created successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    createSystemPlaylist,
};
