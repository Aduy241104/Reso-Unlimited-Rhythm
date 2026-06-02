import express from "express";
import trackController from "../controllers/track.controller.js";
import trackValidation from "../middlewares/track.validation.js";
import validate from "../middlewares/validate.middleware.js";
import { optionalAuthenticate } from "../middlewares/Authentication/authentication.middleware.js";
import  authenticate  from "../middlewares/Authentication/authentication.middleware.js";

const router = express.Router();

router.post(
    "/:id/listen",
    authenticate("user"),
    validate(trackValidation.trackIdParamSchema, "params"),
    validate(trackValidation.listenEventBodySchema, "body"),
    trackController.recordListen
);

router.get(
    "/top/daily",
    validate(trackValidation.dailyTopTracksQuerySchema, "query"),
    trackController.getDailyTopTracks
);

router.get(
    "/top/monthly",
    validate(trackValidation.monthlyTopTracksQuerySchema, "query"),
    trackController.getMonthlyTopTracks
);

router.get(
    "/:id",
    validate(trackValidation.trackIdParamSchema, "params"),
    trackController.getTrackDetail
);

// GET /:id/playback
router.get(
    "/:id/playback",
    optionalAuthenticate(),
    validate(trackValidation.trackIdParamSchema, "params"),
    trackController.getTrackPlayback
);

export default router;