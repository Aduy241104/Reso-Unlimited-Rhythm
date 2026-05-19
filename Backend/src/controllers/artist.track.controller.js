import artistTrackService from "../services/Track/artist.track.service.js";
import formatResponse from "../utils/formatResponse.js";

const createTrack = async (req, res, next) => {
    try {
        const track = await artistTrackService.createTrack(req.user.id, req.body);

        return formatResponse.success(
            res,
            { track },
            "Artist track created successfully"
        );
    } catch (error) {
        next(error);
    }
};

const getMyTracks = async (req, res, next) => {
    try {
        const result = await artistTrackService.getArtistTracks(req.user.id, req.query);

        return formatResponse.success(
            res,
            { tracks: result.tracks },
            "Artist tracks fetched successfully",
            result.pagination
        );
    } catch (error) {
        next(error);
    }
};

const getMyTrackDetail = async (req, res, next) => {
    try {
        const track = await artistTrackService.getArtistTrackDetail(
            req.user.id,
            req.params.id
        );

        return formatResponse.success(
            res,
            { track },
            "Artist track detail fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

const updateMyTrack = async (req, res, next) => {
    try {
        const track = await artistTrackService.updateArtistTrack(
            req.user.id,
            req.params.id,
            req.body
        );

        return formatResponse.success(
            res,
            { track },
            "Artist track updated successfully"
        );
    } catch (error) {
        next(error);
    }
};

const hideMyTrack = async (req, res, next) => {
    try {
        const track = await artistTrackService.hideArtistTrack(
            req.user.id,
            req.params.id,
            req.body?.reason
        );

        return formatResponse.success(
            res,
            { track },
            "Artist track hidden successfully"
        );
    } catch (error) {
        next(error);
    }
};

const deleteMyTrack = async (req, res, next) => {
    try {
        const result = await artistTrackService.deleteArtistTrack(
            req.user.id,
            req.params.id
        );

        return formatResponse.success(
            res,
            result,
            "Artist track deleted successfully"
        );
    } catch (error) {
        next(error);
    }
};

const submitMyTrack = async (req, res, next) => {
    try {
        const track = await artistTrackService.submitArtistTrack(req.user.id, req.params.id);

        return formatResponse.success(
            res,
            { track },
            "Artist track submitted for approval"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    createTrack,
    updateMyTrack,
    getMyTracks,
    getMyTrackDetail,
    hideMyTrack,
    deleteMyTrack,
    submitMyTrack,
};