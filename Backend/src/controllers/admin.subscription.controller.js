import adminSubscriptionService from "../services/subscription/admin.subscription.service.js";
import formatResponse from "../utils/formatResponse.js";

const getPlans = async (req, res, next) => {
    try {
        const result = await adminSubscriptionService.getPlans(req.query);

        return formatResponse.success(
            res,
            { plans: result.plans },
            "Plans fetched successfully",
            result.meta
        );
    } catch (error) {
        next(error);
    }
};

const getPlanDetail = async (req, res, next) => {
    try {
        const result = await adminSubscriptionService.getPlanDetail(req.params.id);

        return formatResponse.success(
            res,
            { plan: result.plan, subscriptionStats: result.subscriptionStats },
            "Plan fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

const createPlan = async (req, res, next) => {
    try {
        const plan = await adminSubscriptionService.createPlan(req.body);

        return formatResponse.success(
            res,
            { plan },
            "Plan created successfully",
            null,
            201
        );
    } catch (error) {
        next(error);
    }
};

const updatePlan = async (req, res, next) => {
    try {
        const plan = await adminSubscriptionService.updatePlan(req.params.id, req.body);

        return formatResponse.success(
            res,
            { plan },
            "Plan updated successfully"
        );
    } catch (error) {
        next(error);
    }
};

const deletePlan = async (req, res, next) => {
    try {
        const plan = await adminSubscriptionService.deletePlan(req.params.id);

        return formatResponse.success(
            res,
            { plan },
            "Plan deleted successfully"
        );
    } catch (error) {
        next(error);
    }
};

const getSubscriptionStats = async (req, res, next) => {
    try {
        const stats = await adminSubscriptionService.getSubscriptionStats(req.query);

        return formatResponse.success(
            res,
            { stats },
            "Subscription statistics fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

const getPlanSubscriptionStats = async (req, res, next) => {
    try {
        const plans = await adminSubscriptionService.getPlanSubscriptionStats();

        return formatResponse.success(
            res,
            { plans },
            "Plan subscription statistics fetched successfully"
        );
    } catch (error) {
        next(error);
    }
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
