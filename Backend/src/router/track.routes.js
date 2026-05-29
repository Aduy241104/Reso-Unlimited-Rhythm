import express from "express";
import trackController from "../controllers/track.controller.js";
import {
    optionalAuthenticate,
} from "../middlewares/Authentication/authentication.middleware.js";

import trackValidation from "../middlewares/track.validation.js";
import validate from "../middlewares/validate.middleware.js";

const router = express.Router();

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

