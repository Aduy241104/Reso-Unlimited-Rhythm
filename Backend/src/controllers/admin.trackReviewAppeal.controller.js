import trackReviewAppealService from "../services/track/track.reviewAppeal.service.js";
import formatResponse from "../utils/formatResponse.js";

const listAppeals = async (req, res, next) => {
    try {
        const result = await trackReviewAppealService.listTrackReviewAppeals(req.query);
        return formatResponse.success(res, { appeals: result.appeals }, "Track appeals fetched successfully", result.pagination);
    } catch (error) {
        next(error);
    }
};

const getAppeal = async (req, res, next) => {
    try {
        const appeal = await trackReviewAppealService.getTrackReviewAppeal(req.params.appealId);
        return formatResponse.success(res, { appeal }, "Track appeal fetched successfully");
    } catch (error) {
        next(error);
    }
};

const acceptAppeal = async (req, res, next) => {
    try {
        const appeal = await trackReviewAppealService.acceptTrackReviewAppeal(req.user.id, req.params.appealId, req.body);
        return formatResponse.success(res, { appeal }, "Track appeal accepted successfully");
    } catch (error) {
        next(error);
    }
};

const rejectAppeal = async (req, res, next) => {
    try {
        const appeal = await trackReviewAppealService.rejectTrackReviewAppeal(req.user.id, req.params.appealId, req.body);
        return formatResponse.success(res, { appeal }, "Track appeal rejected successfully");
    } catch (error) {
        next(error);
    }
};

export default { listAppeals, getAppeal, acceptAppeal, rejectAppeal };

