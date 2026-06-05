import userPlaylistService from "../services/userPlaylist/user.playlist.service.js";
import formatResponse from "../utils/formatResponse.js";

const createMyPlaylist = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.user?._id;
        const playlist = await userPlaylistService.createMyPlaylistByUserId(
            userId,
            req.body,
            req.file
        );


        return formatResponse.success(
            res,
            { playlist },
            "Playlist created successfully"
        );
    } catch (error) {
        next(error);
    }
};
const updateMyPlaylist = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.user?._id;

        const playlist = await userPlaylistService.updateMyPlaylistByUserId(
            userId,
            req.params.id,
            req.body ?? {},
            req.file ?? null
        );

        return formatResponse.success(
            res,
            { playlist },
            "Playlist updated successfully"
        );
    } catch (error) {
        next(error);
    }
};

const updateMyPlaylistCover = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.user?._id;

        const playlist = await userPlaylistService.updateMyPlaylistByUserId(
            userId,
            req.params.id,
            {},
            req.file
        );

        return formatResponse.success(
            res,
            { playlist },
            "Playlist cover updated successfully"
        );
    } catch (error) {
        next(error);
    }
};

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

const getPlaylistDetail = async (req, res, next) => {
    try {
        const playlist = await userPlaylistService.getPlaylistDetail(
            req.params.id,
            {
                currentUserId: req.user?.id || req.user?._id,
            }
        );

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
    createMyPlaylist,
    updateMyPlaylist,
    updateMyPlaylistCover,
    getMyPlaylists,
    getPlaylistDetail
};
