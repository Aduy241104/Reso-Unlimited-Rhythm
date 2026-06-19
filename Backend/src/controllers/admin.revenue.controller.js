import adminRevenueService from "../services/revenue/admin.revenue.service.js";
import formatResponse from "../utils/formatResponse.js";

const getRevenueDashboard = async (req, res, next) => {
    try {
        const dashboard = await adminRevenueService.getRevenueDashboard(req.query);

        return formatResponse.success(
            res,
            dashboard,
            "Revenue dashboard fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

const getRevenuePeriods = async (req, res, next) => {
    try {
        const result = await adminRevenueService.getRevenuePeriods(req.query);

        return formatResponse.success(
            res,
            { revenuePeriods: result.revenuePeriods },
            "Revenue periods fetched successfully",
            result.pagination
        );
    } catch (error) {
        next(error);
    }
};

const getRevenuePeriodDetail = async (req, res, next) => {
    try {
        const revenuePeriod = await adminRevenueService.getRevenuePeriodDetail(
            req.params.id
        );

        return formatResponse.success(
            res,
            { revenuePeriod },
            "Revenue period fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

const triggerRevenueAggregation = async (req, res, next) => {
    try {
        const result = await adminRevenueService.triggerRevenueAggregation(req.body);

        return formatResponse.success(
            res,
            { aggregation: result },
            "Revenue aggregation triggered successfully"
        );
    } catch (error) {
        next(error);
    }
};

const closeRevenuePeriod = async (req, res, next) => {
    try {
        const result = await adminRevenueService.closeRevenuePeriod(req.params.id);

        return formatResponse.success(
            res,
            result,
            "Revenue period closed successfully"
        );
    } catch (error) {
        next(error);
    }
};

const calculateRevenueDistribution = async (req, res, next) => {
    try {
        const result = await adminRevenueService.calculateRevenueDistribution(
            req.params.id
        );

        return formatResponse.success(
            res,
            result,
            "Revenue distribution calculated successfully"
        );
    } catch (error) {
        next(error);
    }
};

const confirmRevenueDistribution = async (req, res, next) => {
    try {
        const result = await adminRevenueService.confirmRevenueDistribution(
            req.params.id,
            req.user.id
        );

        return formatResponse.success(
            res,
            result,
            "Revenue distribution confirmed successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getRevenueDashboard,
    getRevenuePeriods,
    getRevenuePeriodDetail,
    triggerRevenueAggregation,
    closeRevenuePeriod,
    calculateRevenueDistribution,
    confirmRevenueDistribution,
};
