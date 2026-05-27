import artistAlbumService from "../services/artist/artist.album.service.js";
import formatResponse from "../utils/formatResponse.js";

const getMyAlbums = async (req, res, next) => {
    try {
        const result = await artistAlbumService.getMyAlbums(req.user.id, req.query);

        return formatResponse.success(
            res,
            { albums: result.albums },
            "Artist albums fetched successfully",
            result.pagination
        );
    } catch (error) {
        next(error);
    }
};

const getMyAlbumDetail = async (req, res, next) => {
    try {
        const album = await artistAlbumService.getMyAlbumDetail(req.user.id, req.params.id);

        return formatResponse.success(
            res,
            { album },
            "Artist album detail fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

const createAlbum = async (req, res, next) => {
    try {
        const album = await artistAlbumService.createAlbum(req.user.id, req.body, req.file);

        return formatResponse.success(
            res,
            { album },
            "Album created successfully"
        );
    } catch (error) {
        next(error);
    }
};

const updateAlbum = async (req, res, next) => {
    try {
        const album = await artistAlbumService.updateAlbum(req.user.id, req.params.id, req.body, req.file);

        return formatResponse.success(
            res,
            { album },
            "Album updated successfully"
        );
    } catch (error) {
        next(error);
    }
};

const hideAlbum = async (req, res, next) => {
    try {
        const album = await artistAlbumService.hideAlbum(req.user.id, req.params.id);

        return formatResponse.success(
            res,
            { album },
            "Album hidden successfully"
        );
    } catch (error) {
        next(error);
    }
};

const unhideAlbum = async (req, res, next) => {
    try {
        const album = await artistAlbumService.unhideAlbum(req.user.id, req.params.id);

        return formatResponse.success(
            res,
            { album },
            "Album unhidden successfully"
        );
    } catch (error) {
        next(error);
    }
};

const addTrackToAlbum = async (req, res, next) => {
    try {
        const album = await artistAlbumService.addTrackToAlbum(
            req.user.id,
            req.params.id,
            req.body.trackId
        );

        return formatResponse.success(
            res,
            { album },
            "Track added to album successfully"
        );
    } catch (error) {
        next(error);
    }
};

const removeTrackFromAlbum = async (req, res, next) => {
    try {
        const album = await artistAlbumService.removeTrackFromAlbum(
            req.user.id,
            req.params.id,
            req.params.trackId
        );

        return formatResponse.success(
            res,
            { album },
            "Track removed from album successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getMyAlbums,
    getMyAlbumDetail,
    createAlbum,
    updateAlbum,
    hideAlbum,
    unhideAlbum,
    addTrackToAlbum,
    removeTrackFromAlbum,
};
