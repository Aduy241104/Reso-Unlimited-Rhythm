import userListeningAnalyticsService from "../services/user/userListeningAnalytics.service.js";
import formatResponse from "../utils/formatResponse.js";

const getMyRecentListeningActivity = async (req, res, next) => {
    try {
        const activity =
            await userListeningAnalyticsService.getRecentListeningActivityByUserId(
                req.user.id
            );

        return formatResponse.success(
            res,
            { activity },
            "Recent listening activity fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getMyRecentListeningActivity,
};
