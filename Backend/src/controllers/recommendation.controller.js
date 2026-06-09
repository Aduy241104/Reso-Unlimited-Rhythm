import dailyMixService from "../services/recommendation/dailyMix.service.js";
import formatResponse from "../utils/formatResponse.js";

const getDailyMixes = async (req, res, next) => {
    try {
        const result = await dailyMixService.getDailyMixesForUser(req.user.id);

        return formatResponse.success(
            res,
            {
                source: result.source,
                dateKey: result.dateKey,
                mixes: result.mixes,
            },
            "Daily mixes fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

const rebuildDailyMixes = async (req, res, next) => {
    try {
        const result = await dailyMixService.rebuildDailyMixesForUser(req.user.id);

        return formatResponse.success(
            res,
            {
                source: result.source,
                dateKey: result.dateKey,
                mixes: result.mixes,
            },
            "Daily mixes rebuilt successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getDailyMixes,
    rebuildDailyMixes,
};
