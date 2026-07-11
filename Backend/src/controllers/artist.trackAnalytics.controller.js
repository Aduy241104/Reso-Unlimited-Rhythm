import trackAnalyticsService from "../services/artist/trackAnalytics.service.js";
import artistPerformanceOverviewService from "../services/artist/artistPerformanceOverview.service.js";
import formatResponse from "../utils/formatResponse.js";

const getArtistPerformanceOverviewController = async (req, res, next) => {
    try {
        const overview =
            await artistPerformanceOverviewService.getArtistPerformanceOverview({
                userId: req.user.id,
                range: req.query.range,
                year: req.query.year,
            });

        return formatResponse.success(
            res,
            overview,
            "Artist performance overview fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

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

export default {
    getArtistPerformanceOverviewController,
    getTrackAnalyticsOverviewController,
};
