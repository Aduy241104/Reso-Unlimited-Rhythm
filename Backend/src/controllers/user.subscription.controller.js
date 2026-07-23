import userSubscriptionService from "../services/userSubscription/user.subscription.service.js";
import formatResponse from "../utils/formatResponse.js";

const getSubscriptionStatus = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.user?._id || req.user?.userId;
        const result = await userSubscriptionService.getSubscriptionStatus(userId);

        return formatResponse.success(
            res,
            result,
            "Get subscription status successfully"
        );
    } catch (error) {
        next(error);
    }
};

const checkPremiumStatus = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.user?._id || req.user?.userId;
        const result = await userSubscriptionService.getSubscriptionStatus(userId);

        return formatResponse.success(
            res,
            result,
            "Premium status checked successfully"
        );
    } catch (error) {
        next(error);
    }
};

export { getSubscriptionStatus, checkPremiumStatus };

export default {
    getSubscriptionStatus,
    checkPremiumStatus,
};
