import trackReviewAppealService from "../services/track/track.reviewAppeal.service.js";
import formatResponse from "../utils/formatResponse.js";

const createAppeal = async (req, res, next) => {
    try {
        const appeal = await trackReviewAppealService.createTrackReviewAppeal(req.user.id, req.params.id, req.body);
        return formatResponse.success(res, { appeal }, "Phản hồi quyết định đã được gửi.");
    } catch (error) {
        next(error);
    }
};

const listAppeals = async (req, res, next) => {
    try {
        const appeals = await trackReviewAppealService.listArtistTrackReviewAppeals(req.user.id, req.params.id);
        return formatResponse.success(res, { appeals }, "Danh sách phản hồi quyết định đã được tải.");
    } catch (error) {
        next(error);
    }
};

const uploadEvidence = async (req, res, next) => {
    try {
        const evidenceDocuments = await trackReviewAppealService.uploadTrackReviewAppealEvidence(req.user.id, req.params.id, req.files || []);
        return formatResponse.success(res, { evidenceDocuments }, "Appeal evidence uploaded.");
    } catch (error) {
        next(error);
    }
};

const latestAppeal = async (req, res, next) => {
    try {
        const appeal = await trackReviewAppealService.getLatestArtistTrackReviewAppeal(req.user.id, req.params.id);
        return formatResponse.success(res, { appeal }, "Phản hồi quyết định mới nhất đã được tải.");
    } catch (error) {
        next(error);
    }
};

export default { createAppeal, listAppeals, latestAppeal, uploadEvidence };
