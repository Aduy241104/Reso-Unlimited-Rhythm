import express from "express";
import trackController from "../controllers/track.controller.js";
import trackValidation from "../middlewares/track.validation.js";
import adminTrackValidation from "../middlewares/Admin/admin.track.validation.js";
import validate from "../middlewares/validate.middleware.js";
import {
    authorizeRoles,
    optionalAuthenticate,
} from "../middlewares/Authentication/authentication.middleware.js";
import { requireAdmin, requireArtist } from "../middlewares/Authentication/authentication.middleware.js";
import artistTrackController from "../controllers/artist.track.controller.js";
import adminTrackController from "../controllers/admin.track.controller.js";

const router = express.Router();


router.post(
    "/:id/listen",
    authorizeRoles("user", "artist"),
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

// Admin: must be registered before `/:id` so `/admin` is not captured as an id
router.get(
    "/admin",
    requireAdmin,
    adminTrackController.listTracksForAdmin
);

router.patch(
    "/admin/:id/approval",
    requireAdmin,
    validate(trackValidation.trackIdParamSchema, "params"),
    validate(adminTrackValidation.updateTrackApprovalSchema, "body"),
    adminTrackController.updateTrackApprovalStatus
);

router.patch(
    "/admin/:id/visibility",
    requireAdmin,
    validate(trackValidation.trackIdParamSchema, "params"),
    validate(adminTrackValidation.updateTrackVisibilitySchema, "body"),
    adminTrackController.updateTrackVisibilityController
);

router.get(
    "/:id",
    validate(trackValidation.trackIdParamSchema, "params"),
    trackController.getTrackDetail
);

router.get(
    "/:id/playback",
    optionalAuthenticate(),
    validate(trackValidation.trackIdParamSchema, "params"),
    trackController.getTrackPlayback
);

export default router;
