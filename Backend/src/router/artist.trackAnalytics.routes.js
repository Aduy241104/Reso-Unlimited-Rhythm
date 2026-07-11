import express from "express";
import artistTrackAnalyticsController from "../controllers/artist.trackAnalytics.controller.js";
import { requireArtist } from "../middlewares/Authentication/authentication.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import trackValidation from "../middlewares/track.validation.js";

const router = express.Router();

router.get(
    "/overview/performance",
    requireArtist,
    artistTrackAnalyticsController.getArtistPerformanceOverviewController
);

router.get(
    "/tracks/:trackId/analytics",
    requireArtist,
    validate(trackValidation.trackAnalyticsTrackIdParamSchema, "params"),
    artistTrackAnalyticsController.getTrackAnalyticsOverviewController
);

export default router;
