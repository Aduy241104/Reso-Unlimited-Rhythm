import trackService from "../services/track/track.service.js";
import listenEventService from "../services/listenEvent/listenEvent.service.js";
import formatResponse from "../utils/formatResponse.js";

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
        const playbackTrackId = req.params.id ?? req.query.trackId;
        const track = await trackService.getTrackPlayback(playbackTrackId, req.user);

        return formatResponse.success(
            res,
            { track },
            "Track playback fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

const getDailyTopTracks = async (req, res, next) => {
    try {
        const { topTracks, meta } = await trackService.getDailyTopTracks(req.query);

        return formatResponse.success(
            res,
            { topTracks },
            "Daily top tracks fetched successfully",
            meta
        );
    } catch (error) {
        next(error);
    }
};

const getMonthlyTopTracks = async (req, res, next) => {
    try {
        const { topTracks, meta } = await trackService.getMonthlyTopTracks(req.query);

        return formatResponse.success(
            res,
            { topTracks },
            "Monthly top tracks fetched successfully",
            meta
        );
    } catch (error) {
        next(error);
    }
};

const recordListen = async (req, res, next) => {
    try {
        const { duration, source } = req.body;
        const result = await listenEventService.recordCompletedListenAttempt({
            userId: req.user.id,
            trackId: req.params.id,
            listenedDuration: duration,
            source,
        });

        return formatResponse.success(
            res,
            result,
            "Listen event recorded successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getTrackDetail,
    getTrackPlayback,
    getDailyTopTracks,
    getMonthlyTopTracks,
    recordListen,
};
