import Transaction from "../../models/Transaction.js";

const normalizePlanSnapshot = (planSnapshot) => {
    if (!planSnapshot) {
        return null;
    }

    return {
        originalPlanId: planSnapshot.originalPlanId || null,
        name: planSnapshot.name || "",
        price: Number(planSnapshot.price || 0),
        durationDays: Number(planSnapshot.durationDays || 0),
        description: planSnapshot.description || "",
        features: Array.isArray(planSnapshot.features) ? [...planSnapshot.features] : [],
        status: planSnapshot.status || "active",
    };
};

const normalizeLegacyPlan = (plan) => {
    if (!plan) {
        return null;
    }

    return {
        originalPlanId: plan._id || null,
        name: plan.name || "",
        price: Number(plan.price || 0),
        durationDays: Number(plan.durationDays || plan.duration || 0),
        description: plan.description || "",
        features: Array.isArray(plan.features) ? [...plan.features] : [],
        status: plan.status || "active",
    };
};

const getByUserId = async (userId) => {
    const transactions = await Transaction.find({ userId })
        .populate("subscriptionId", "planSnapshot planId")
        .populate("planId", "name price durationDays description features status")
        .sort({ createdAt: -1 })
        .lean();

    return transactions.map((transaction) => {
        const planSnapshot =
            normalizePlanSnapshot(transaction.planSnapshot) ||
            normalizePlanSnapshot(transaction.subscriptionId?.planSnapshot) ||
            normalizeLegacyPlan(transaction.subscriptionId?.planId) ||
            normalizeLegacyPlan(transaction.planId);

        return {
            ...transaction,
            planId: planSnapshot?.originalPlanId || transaction.planId?._id || transaction.planId || null,
            plan: planSnapshot,
            planSnapshot,
        };
    });
};

export default {
    getByUserId,
};
