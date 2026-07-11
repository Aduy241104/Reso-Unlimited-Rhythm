import Subscription from "../../models/Subscription.js";
import User from "../../models/User.js";
import { AppError } from "../../utils/AppError.js";
import {
    buildEmptySubscriptionResponse,
    calculateDaysRemaining,
} from "./user.subscription.service.helper.js";

const buildSubscriptionStatusResponse = (user, subscription) => {
    const now = new Date();
    const plan =
        subscription.planId && typeof subscription.planId === "object"
            ? subscription.planId
            : null;
    const premiumEndDate = user.subscription?.premiumEndDate
        ? new Date(user.subscription.premiumEndDate)
        : null;
    const isPremiumFromUser =
        Boolean(user.subscription?.isPremium) &&
        (!premiumEndDate || premiumEndDate > now);
    const isPremiumFromSubscription =
        subscription.status === "active" &&
        Boolean(subscription.endDate) &&
        new Date(subscription.endDate) > now;

    return {
        isPremium: isPremiumFromUser || isPremiumFromSubscription,
        planId: plan?._id?.toString?.() || subscription.planId?.toString?.() || null,
        planName: plan?.name || null,
        price: plan?.price ?? null,
        durationDays: plan?.durationDays ?? null,
        status: subscription.status || "none",
        startDate: subscription.startDate || null,
        endDate: subscription.endDate || null,
        autoRenew: Boolean(subscription.autoRenew),
        daysRemaining: calculateDaysRemaining(subscription.endDate),
        features: Array.isArray(plan?.features) ? plan.features : [],
    };
};

const getSubscriptionStatus = async (userId) => {
    if (!userId) {
        throw new AppError("Unauthorized.", 401);
    }

    const [user, newestSubscription] = await Promise.all([
        User.findById(userId).select("subscription").lean(),
        Subscription.findOne({ userId })
            .sort({ createdAt: -1 })
            .populate({
                path: "planId",
                select: "name price durationDays features",
            })
            .lean(),
    ]);

    if (!user) {
        throw new AppError("User does not exist.", 404);
    }

    if (!newestSubscription) {
        return buildEmptySubscriptionResponse();
    }

    return buildSubscriptionStatusResponse(user, newestSubscription);
};

export { getSubscriptionStatus };

export default {
    getSubscriptionStatus,
};
