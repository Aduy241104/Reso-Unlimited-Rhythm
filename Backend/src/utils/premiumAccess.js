import Subscription from "../models/Subscription.js";

const normalizeUserId = (user = {}) => {
    if (user.id) {
        return user.id.toString();
    }

    if (user._id) {
        return user._id.toString();
    }

    return "";
};

export const hasPremiumFlagActive = (subscription = {}, now = new Date()) => {
    const premiumEndDate = subscription?.premiumEndDate
        ? new Date(subscription.premiumEndDate)
        : null;

    return Boolean(subscription?.isPremium) &&
        (!premiumEndDate || premiumEndDate > now);
};

export const hasActivePremiumSubscription = async (
    userId,
    now = new Date()
) => {
    if (!userId) {
        return false;
    }

    const activeSubscription = await Subscription.exists({
        userId,
        status: "active",
        $and: [
            {
                $or: [
                    { startDate: null },
                    { startDate: { $lte: now } },
                ],
            },
            {
                $or: [
                    { endDate: null },
                    { endDate: { $gt: now } },
                ],
            },
        ],
    });

    return Boolean(activeSubscription);
};

export const resolveUserPremiumState = async (
    user = {},
    now = new Date()
) => {
    if (hasPremiumFlagActive(user.subscription, now)) {
        return true;
    }

    return hasActivePremiumSubscription(normalizeUserId(user), now);
};

export default {
    hasPremiumFlagActive,
    hasActivePremiumSubscription,
    resolveUserPremiumState,
};
