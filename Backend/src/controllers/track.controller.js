import trackService from "../services/track/track.service.js";
import formatResponse from "../utils/formatResponse.js";

const createTrack = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const trackData = req.body;

        const track = await trackService.createTrack(userId, trackData);

        return formatResponse.success(
            res,
            { track },
            "Track created successfully"
        );
    } catch (error) {
        next(error);
    }
};

const getTrackDetail = async (req, res, next) => {
    try {
        const track = await trackService.getTrackDetail(req.params.id);

        return formatResponse.success(
            res,
            { track },
            "Track fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

const getTrackPlayback = async (req, res, next) => {
    try {
        const track = await trackService.getTrackPlayback(req.params.id, req.user);

        return formatResponse.success(
            res,
            { track },
            "Track playback fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    createTrack,
    getTrackDetail,
    getTrackPlayback,
};
