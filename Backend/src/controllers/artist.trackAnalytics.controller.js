import trackAnalyticsService from "../services/artist/trackAnalytics.service.js";
import formatResponse from "../utils/formatResponse.js";

const getTrackAnalyticsOverviewController = async (req, res, next) => {
    try {
        const analytics = await trackAnalyticsService.getTrackAnalyticsOverview({
            userId: req.user.id,
            trackId: req.params.trackId,
            range: req.query.range,
            from: req.query.from,
            to: req.query.to,
        });

        return formatResponse.success(
            res,
            analytics,
            "Track analytics fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

const getTrackDailyAnalyticsController = async (req, res, next) => {
    try {
        const analytics = await trackAnalyticsService.getTrackDailyAnalytics({
            userId: req.user.id,
            trackId: req.params.trackId,
            from: req.query.from,
            to: req.query.to,
        });

        return formatResponse.success(
            res,
            analytics,
            "Daily track analytics fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

const getTrackMonthlyAnalyticsController = async (req, res, next) => {
    try {
        const analytics = await trackAnalyticsService.getTrackMonthlyAnalytics({
            userId: req.user.id,
            trackId: req.params.trackId,
            year: req.query.year,
        });

        return formatResponse.success(
            res,
            analytics,
            "Monthly track analytics fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

const compareTrackPerformanceController = async (req, res, next) => {
    try {
        const analytics = await trackAnalyticsService.compareTrackPerformance({
            userId: req.user.id,
            trackId: req.params.trackId,
            currentFrom: req.query.currentFrom,
            currentTo: req.query.currentTo,
            previousFrom: req.query.previousFrom,
            previousTo: req.query.previousTo,
        });

        return formatResponse.success(
            res,
            analytics,
            "Track performance comparison fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getTrackAnalyticsOverviewController,
    getTrackDailyAnalyticsController,
    getTrackMonthlyAnalyticsController,
    compareTrackPerformanceController,
};
