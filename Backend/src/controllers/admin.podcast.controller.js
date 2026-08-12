import podcastAdminService from "../services/podcast/podcast.admin.service.js";
import formatResponse from "../utils/formatResponse.js";
import podcastModerationService from "../services/podcast/podcast.moderation.service.js";

const list = async (req, res, next) => {
    try {
        const result = await podcastAdminService.listAdminPodcasts(req.query);
        return formatResponse.success(res, { podcasts: result.podcasts }, "Admin podcasts fetched successfully.", result.pagination);
    } catch (error) { next(error); }
};

const detail = async (req, res, next) => {
    try {
        const podcast = await podcastAdminService.getAdminPodcast(req.params.id);
        return formatResponse.success(res, { podcast }, "Podcast detail fetched successfully.");
    } catch (error) { next(error); }
};

const approve = async (req, res, next) => {
    try {
        const podcast = await podcastAdminService.approvePodcast(req.params.id, req.user.id, req.body.reviewSessionId);
        return formatResponse.success(res, { podcast }, "Podcast approved successfully.");
    } catch (error) { next(error); }
};

const startReviewSession = async (req, res, next) => {
    try {
        const review = await podcastModerationService.ensureReviewSession(req.user.id, req.params.id);
        return formatResponse.success(res, { review }, "Podcast review session ready.");
    } catch (error) { next(error); }
};

const recordReviewEvent = async (req, res, next) => {
    try {
        const review = await podcastModerationService.recordReviewEvent(req.user.id, req.params.id, req.body);
        return formatResponse.success(res, { review }, "Podcast review event recorded.");
    } catch (error) { next(error); }
};

const reject = async (req, res, next) => {
    try {
        const podcast = await podcastAdminService.rejectPodcast(req.params.id, req.user.id, req.body.reason);
        return formatResponse.success(res, { podcast }, "Podcast rejected successfully.");
    } catch (error) { next(error); }
};

const block = async (req, res, next) => {
    try {
        const podcast = await podcastAdminService.blockPodcast(req.params.id, req.user.id, req.body.reason);
        return formatResponse.success(res, { podcast }, "Podcast blocked successfully.");
    } catch (error) { next(error); }
};

const unblock = async (req, res, next) => {
    try {
        const podcast = await podcastAdminService.unblockPodcast(req.params.id);
        return formatResponse.success(res, { podcast }, "Podcast unblocked successfully.");
    } catch (error) { next(error); }
};

export default { list, detail, approve, startReviewSession, recordReviewEvent, reject, block, unblock };
