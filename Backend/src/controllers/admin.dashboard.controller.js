import platformStreamingStatsService from "../services/analytics/platformStreamingStats.service.js";
import formatResponse from "../utils/formatResponse.js";

const getOverviewStats = async (req, res, next) => {
    try {
        const stats = await platformStreamingStatsService.getOverviewStats();
        return formatResponse.success(res, { stats }, "Overview stats fetched successfully");
    } catch (error) {
        next(error);
    }
};

const getMonthlyOverview = async (req, res, next) => {
    try {
        const { year, month } = req.query;
        const stats = await platformStreamingStatsService.getMonthlyOverview(
            year ? Number(year) : undefined,
            month ? Number(month) : undefined
        );
        return formatResponse.success(res, { stats }, "Monthly overview fetched successfully");
    } catch (error) {
        next(error);
    }
};

const getDailyStats = async (req, res, next) => {
    try {
        const { date } = req.query;
        const stats = await platformStreamingStatsService.getDailyStats(date);
        return formatResponse.success(res, { stats }, "Daily stats fetched successfully");
    } catch (error) {
        next(error);
    }
};

export default {
    getOverviewStats,
    getMonthlyOverview,
    getDailyStats,
};
