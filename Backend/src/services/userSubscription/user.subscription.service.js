import Subscription from "../../models/Subscription.js";
import User from "../../models/User.js";
import { AppError } from "../../utils/AppError.js";
import {
    buildEmptySubscriptionResponse,
    calculateDaysRemaining,
} from "./user.subscription.service.helper.js";

const buildSubscriptionStatusResponse = (
    user,
    subscription,
    now = new Date()
) => {
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
        (!subscription.startDate || new Date(subscription.startDate) <= now) &&
        (!subscription.endDate || new Date(subscription.endDate) > now);

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

const synchronizePremiumState = async (userId, now = new Date()) => {
    await Subscription.updateMany(
        {
            userId,
            status: "active",
            endDate: { $lte: now },
        },
        {
            $set: {
                status: "expired",
            },
        }
    );

    const activeSubscription = await Subscription.findOne({
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
    })
        .sort({ endDate: -1, createdAt: -1 })
        .lean();

    if (activeSubscription) {
        return;
    }

    await User.updateOne(
        {
            _id: userId,
            "subscription.isPremium": true,
            "subscription.premiumEndDate": { $lte: now },
        },
        {
            $set: {
                "subscription.isPremium": false,
                "subscription.currentPlanId": null,
            },
        }
    );
};

const getSubscriptionStatus = async (userId) => {
    if (!userId) {
        throw new AppError("Unauthorized.", 401);
    }

    const now = new Date();

    await synchronizePremiumState(userId, now);

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
        return {
            ...buildEmptySubscriptionResponse(),
            isPremium:
                Boolean(user.subscription?.isPremium) &&
                (!user.subscription?.premiumEndDate ||
                    new Date(user.subscription.premiumEndDate) > now),
            planId: user.subscription?.currentPlanId?.toString?.() || null,
            endDate: user.subscription?.premiumEndDate || null,
            daysRemaining: calculateDaysRemaining(
                user.subscription?.premiumEndDate
            ),
        };
    }

    return buildSubscriptionStatusResponse(user, newestSubscription, now);
};

export { getSubscriptionStatus, synchronizePremiumState };

export default {
    getSubscriptionStatus,
    synchronizePremiumState,
};
