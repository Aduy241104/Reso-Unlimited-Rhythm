import express from "express";
import artistTrackAnalyticsController from "../controllers/artist.trackAnalytics.controller.js";
import { requireArtist } from "../middlewares/Authentication/authentication.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import trackValidation from "../middlewares/track.validation.js";

const router = express.Router();

router.get(
    "/tracks/:trackId/analytics",
    requireArtist,
    validate(trackValidation.trackAnalyticsTrackIdParamSchema, "params"),
    artistTrackAnalyticsController.getTrackAnalyticsOverviewController
);

router.get(
    "/tracks/:trackId/analytics/daily",
    requireArtist,
    validate(trackValidation.trackAnalyticsTrackIdParamSchema, "params"),
    artistTrackAnalyticsController.getTrackDailyAnalyticsController
);

router.get(
    "/tracks/:trackId/analytics/monthly",
    requireArtist,
    validate(trackValidation.trackAnalyticsTrackIdParamSchema, "params"),
    artistTrackAnalyticsController.getTrackMonthlyAnalyticsController
);

router.get(
    "/tracks/:trackId/analytics/compare",
    requireArtist,
    validate(trackValidation.trackAnalyticsTrackIdParamSchema, "params"),
    artistTrackAnalyticsController.compareTrackPerformanceController
);

export default router;
