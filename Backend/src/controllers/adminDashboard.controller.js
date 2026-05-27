import dashboardService from "../services/Dashboard/dashboard.service.js";
import formatResponse from "../utils/formatResponse.js";

const getOverviewStats = async (req, res, next) => {
    try {
        const days = Math.min(30, Math.max(1, parseInt(req.query.days) || 7));
        const data = await dashboardService.aggregateOverviewStats(days);
        return formatResponse.success(res, data, "Overview stats fetched successfully");
    } catch (error) {
        next(error);
    }
};

const getDailyStats = async (req, res, next) => {
    try {
        const days = Math.min(30, Math.max(1, parseInt(req.query.days) || 7));
        const data = await dashboardService.getDailyStats(days);
        return formatResponse.success(res, { dailyStats: data }, "Daily stats fetched successfully");
    } catch (error) {
        next(error);
    }
};

const getTopTracks = async (req, res, next) => {
    try {
        const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 10));
        const data = await dashboardService.getTopTracksAllTime(limit);
        return formatResponse.success(res, { topTracks: data }, "Top tracks fetched successfully");
    } catch (error) {
        next(error);
    }
};

const getTopArtists = async (req, res, next) => {
    try {
        const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 10));
        const data = await dashboardService.getTopArtistsAllTime(limit);
        return formatResponse.success(res, { topArtists: data }, "Top artists fetched successfully");
    } catch (error) {
        next(error);
    }
};

const getMonthlyStats = async (req, res, next) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const month = parseInt(req.query.month) || new Date().getMonth() + 1;
        const data = await dashboardService.getMonthlyStats(year, month);
        return formatResponse.success(res, { monthlyStats: data }, "Monthly stats fetched successfully");
    } catch (error) {
        next(error);
    }
};

const getRecentMonthsStats = async (req, res, next) => {
    try {
        const months = Math.min(12, Math.max(1, parseInt(req.query.months) || 6));
        const data = await dashboardService.getRecentMonthsStats(months);
        return formatResponse.success(res, { monthsStats: data }, "Recent months stats fetched successfully");
    } catch (error) {
        next(error);
    }
};

export default {
    getOverviewStats,
    getDailyStats,
    getTopTracks,
    getTopArtists,
    getMonthlyStats,
    getRecentMonthsStats,
};
