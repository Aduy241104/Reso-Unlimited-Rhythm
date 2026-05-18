import express from "express";
import trackController from "../controllers/track.controller.js";
import adminTrackController from "../controllers/admin.track.controller.js";

import {
    optionalAuthenticate,
    requireAdmin,
} from "../middlewares/Authentication/authentication.middleware.js";

import trackValidation from "../middlewares/track.validation.js";
import validate from "../middlewares/validate.middleware.js";

const router = express.Router();

// Admin: must be registered before `/:id` so `/admin` is not captured as an id
router.get(
    "/admin",
    requireAdmin,
    adminTrackController.listTracksForAdmin
);

// User routes
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
