import express from "express";
import trackController from "../controllers/track.controller.js";
import uploadController from "../controllers/upload.controller.js";
import authenticate from "../middlewares/Authentication/authentication.middleware.js";
import { optionalAuthenticate } from "../middlewares/Authentication/authentication.middleware.js";
import createTrackSchema from "../middlewares/TrackMiddlewareValidation/track.validation.js";
import trackValidation from "../middlewares/track.validation.js";
import validate from "../middlewares/validate.middleware.js";
import upload from "../middlewares/upload.middleware.js";

const router = express.Router();

router.post(
    "/upload",
    authenticate("artist"),
    upload.fields([
        { name: "audioFiles", maxCount: 1 },
        { name: "avatar", maxCount: 1 },
        { name: "coverImages", maxCount: 5 },
        { name: "lyricsSync", maxCount: 1 },
    ]),
    uploadController
);

router.post(
    "/",
    authenticate("artist"),
    validate(createTrackSchema, "body"),
    trackController.createTrack
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
