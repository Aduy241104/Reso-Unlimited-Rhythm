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

const getSystemPlaylistDetail = async (req, res, next) => {
    try {
        const playlist = await adminPlaylistService.getSystemPlaylistDetailForAdmin(
            req.params.playlistId
        );

        return formatResponse.success(
            res,
            { playlist },
            "System playlist fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

const updateSystemPlaylist = async (req, res, next) => {
    try {
        const playlist = await adminPlaylistService.updateSystemPlaylist(
            req.params.playlistId,
            req.body
        );

        return formatResponse.success(
            res,
            { playlist },
            "System playlist updated successfully"
        );
    } catch (error) {
        next(error);
    }
};

const deleteSystemPlaylist = async (req, res, next) => {
    try {
        await adminPlaylistService.deleteSystemPlaylist(req.params.playlistId);

        return formatResponse.success(
            res,
            { deleted: true },
            "System playlist deleted successfully"
        );
    } catch (error) {
        next(error);
    }
};

const addTrackToSystemPlaylist = async (req, res, next) => {
    try {
        const playlist = await adminPlaylistService.addTrackToSystemPlaylist(
            req.params.playlistId,
            req.body.trackId
        );

        return formatResponse.success(
            res,
            { playlist },
            "Track added to system playlist"
        );
    } catch (error) {
        next(error);
    }
};

const addTracksToSystemPlaylistBatch = async (req, res, next) => {
    try {
        const { playlist, addedCount } = await adminPlaylistService.addTracksToSystemPlaylistBatch(
            req.params.playlistId,
            req.body.trackIds
        );

        return formatResponse.success(
            res,
            { playlist, addedCount },
            addedCount === 1
                ? "1 track added to system playlist"
                : `${addedCount} tracks added to system playlist`
        );
    } catch (error) {
        next(error);
    }
};

const removeTrackFromSystemPlaylist = async (req, res, next) => {
    try {
        const playlist = await adminPlaylistService.removeTrackFromSystemPlaylist(
            req.params.playlistId,
            req.params.trackId
        );

        return formatResponse.success(
            res,
            { playlist },
            "Track removed from system playlist"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    createSystemPlaylist,
    getSystemPlaylistDetail,
    updateSystemPlaylist,
    deleteSystemPlaylist,
    addTrackToSystemPlaylist,
    addTracksToSystemPlaylistBatch,
    removeTrackFromSystemPlaylist,
};
