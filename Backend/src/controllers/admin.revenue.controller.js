import adminRevenueService from "../services/revenue/admin.revenue.service.js";
import formatResponse from "../utils/formatResponse.js";

const getCurrentRevenuePeriod = async (req, res, next) => {
    try {
        const revenuePeriod = await adminRevenueService.getCurrentRevenuePeriod();

        return formatResponse.success(
            res,
            revenuePeriod,
            "Current revenue period fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

const getRevenueCharts = async (req, res, next) => {
    try {
        const revenueCharts = await adminRevenueService.getRevenueCharts(req.query);

        return formatResponse.success(
            res,
            revenueCharts,
            "Revenue charts fetched successfully"
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
            revenuePeriod,
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

const processRevenuePeriodAction = async (req, res, next) => {
    try {
        const { action } = req.body;
        const result = await adminRevenueService.processRevenuePeriodAction(
            req.params.id,
            action,
            req.user.id
        );

        const successMessages = {
            close: "Revenue period closed successfully",
            calculate: "Revenue distribution calculated successfully",
            confirm: "Revenue distribution confirmed successfully",
        };

        return formatResponse.success(
            res,
            result,
            successMessages[action] || "Revenue period processed successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getCurrentRevenuePeriod,
    getRevenueCharts,
    getRevenuePeriods,
    getRevenuePeriodDetail,
    triggerRevenueAggregation,
    processRevenuePeriodAction,
    closeRevenuePeriod,
    calculateRevenueDistribution,
    confirmRevenueDistribution,
};
