import advertisementService from "../services/advertisement/advertisement.service.js";
import formatResponse from "../utils/formatResponse.js";

const decide = async (req, res, next) => {
    try {
        const result = await advertisementService.decideAdvertisement({
            user: req.user,
            sessionId: req.body?.sessionId,
            type: req.body?.type,
            placement: req.body?.placement,
            country: req.headers["cf-ipcountry"] || req.headers["x-country-code"] || req.body?.country,
            genreIds: Array.isArray(req.body?.genreIds) ? req.body.genreIds : [],
            transitionId: req.body?.transitionId,
        });
        return formatResponse.success(res, result, "Advertisement decision completed.");
    } catch (error) { next(error); }
};

const recordEvent = async (req, res, next) => {
    try {
        const event = await advertisementService.recordAdvertisementEvent({
            token: req.body?.decisionToken,
            eventType: req.body?.eventType,
            playedSeconds: req.body?.playedSeconds,
        });
        return formatResponse.success(res, { event }, "Advertisement event processed.");
    } catch (error) { next(error); }
};

export default { decide, recordEvent };
