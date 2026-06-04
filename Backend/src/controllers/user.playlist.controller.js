import userPlaylistService from "../services/userPlaylist/user.playlist.service.js";
import formatResponse from "../utils/formatResponse.js";

const getMyPlaylists = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.user?._id;

        const result = await userPlaylistService.getMyPlaylistsByUserId(
            userId,
            req.query
        );

        return formatResponse.success(
            res,
            result,
            "Playlists fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getMyPlaylists,
};