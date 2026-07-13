import mongoose from "mongoose";
import Plan from "../../models/Plan.js";
import Subscription from "../../models/Subscription.js";
import { AppError } from "../../utils/AppError.js";

const VALID_STATUSES = ["active", "inactive"];

const getPlans = async (query) => {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit) || 20));

    const filter = {};

    if (query.status && VALID_STATUSES.includes(query.status)) {
        filter.status = query.status;
    }

    if (query.q) {
        const regex = new RegExp(query.q, "i");
        filter.$or = [
            { name: regex },
            { description: regex },
        ];
    }

    const total = await Plan.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const clampedPage = Math.min(page, totalPages);
    const skip = (clampedPage - 1) * limit;

    const [plans, _total] = await Promise.all([
        Plan.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Plan.countDocuments(filter),
    ]);

    const meta = {
        page: clampedPage,
        limit,
        total,
        totalPages,
    };

    return { plans, meta };
};

const getPlanDetail = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError("Invalid plan ID", 400);
    }

    const plan = await Plan.findById(id).lean();

    if (!plan) {
        throw new AppError("Plan not found", 404);
    }

    const subscriptionStats = {
        total: await Subscription.countDocuments({ planId: id }),
        active: await Subscription.countDocuments({ planId: id, status: "active" }),
        expired: await Subscription.countDocuments({ planId: id, status: "expired" }),
        cancelled: await Subscription.countDocuments({ planId: id, status: "cancelled" }),
        pending: await Subscription.countDocuments({ planId: id, status: "pending" }),
    };

    return { plan, subscriptionStats };
};

const createPlan = async (data) => {
    const { name, price, durationDays, description, features, status } = data;

    const planData = {
        name: name?.trim(),
        price: Number(price) || 0,
        durationDays: Number(durationDays) || 30,
        description: description?.trim() || "",
        features: features || [],
        status: VALID_STATUSES.includes(status) ? status : "active",
    };

    const plan = await Plan.create(planData);

    return plan;
};

const updatePlan = async (id, data) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError("Invalid plan ID", 400);
    }

    const updates = {};

    if (typeof data.name === "string" && data.name.trim() !== "") {
        updates.name = data.name.trim();
    }

    if (typeof data.price === "number" && data.price >= 0) {
        updates.price = data.price;
    }

    if (typeof data.durationDays === "number" && data.durationDays > 0) {
        updates.durationDays = data.durationDays;
    }

    if (typeof data.description === "string") {
        updates.description = data.description.trim();
    }

    if (Array.isArray(data.features)) {
        updates.features = data.features;
    }

    if (VALID_STATUSES.includes(data.status)) {
        updates.status = data.status;
    }

    const plan = await Plan.findByIdAndUpdate(id, updates, { new: true, lean: true });

    if (!plan) {
        throw new AppError("Plan not found", 404);
    }

    return plan;
};

const deletePlan = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError("Invalid plan ID", 400);
    }

    const plan = await Plan.findByIdAndDelete(id);

    if (!plan) {
        throw new AppError("Plan not found", 404);
    }

    return plan;
};

const getSubscriptionStats = async (query) => {
    const filter = {};

    if (query.status && ["pending", "active", "cancelled", "expired"].includes(query.status)) {
        filter.status = query.status;
    }

    if (query.planId && mongoose.Types.ObjectId.isValid(query.planId)) {
        filter.planId = query.planId;
    }

    const [byStatusResult, total] = await Promise.all([
        Subscription.aggregate([
            { $match: filter },
            { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        Subscription.countDocuments(filter),
    ]);

    const byStatus = {
        pending: 0,
        active: 0,
        cancelled: 0,
        expired: 0,
    };

    byStatusResult.forEach((item) => {
        if (byStatus.hasOwnProperty(item._id)) {
            byStatus[item._id] = item.count;
        }
    });

    return {
        totalSubscriptions: total,
        byStatus,
    };
};

const getPlanSubscriptionStats = async () => {
    const plans = await Plan.find({})
        .sort({ createdAt: -1 })
        .lean();

    const subscriptionStats = await Subscription.aggregate([
        {
            $group: {
                _id: {
                    planId: "$planId",
                    status: "$status",
                },
                count: { $sum: 1 },
            },
        },
    ]);

    const statsByPlanId = new Map();

    subscriptionStats.forEach((item) => {
        const planId = String(item._id?.planId);
        const status = item._id?.status;

        if (!statsByPlanId.has(planId)) {
            statsByPlanId.set(planId, {
                totalSubscriptions: 0,
                activeSubscriptions: 0,
                expiredSubscriptions: 0,
                pendingSubscriptions: 0,
                cancelledSubscriptions: 0,
            });
        }

        const planStats = statsByPlanId.get(planId);
        planStats.totalSubscriptions += item.count;

        if (status === "active") {
            planStats.activeSubscriptions = item.count;
        }

        if (status === "expired") {
            planStats.expiredSubscriptions = item.count;
        }

        if (status === "pending") {
            planStats.pendingSubscriptions = item.count;
        }

        if (status === "cancelled") {
            planStats.cancelledSubscriptions = item.count;
        }
    });

    return plans.map((plan) => {
        const planId = String(plan._id);
        const stats = statsByPlanId.get(planId) || {
            totalSubscriptions: 0,
            activeSubscriptions: 0,
            expiredSubscriptions: 0,
            pendingSubscriptions: 0,
            cancelledSubscriptions: 0,
        };

        return {
            planId: plan._id,
            planName: plan.name,
            planPrice: plan.price,
            planDurationDays: plan.durationDays,
            planStatus: plan.status,
            ...stats,
        };
    });
};

export default {
    getPlans,
    getPlanDetail,
    createPlan,
    updatePlan,
    deletePlan,
    getSubscriptionStats,
    getPlanSubscriptionStats,
};
