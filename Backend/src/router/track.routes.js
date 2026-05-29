import express from "express";
import trackController from "../controllers/track.controller.js";
import artistTrackController from "../controllers/artist.track.controller.js";
import uploadController from "../controllers/upload.controller.js";
import authenticate from "../middlewares/Authentication/authentication.middleware.js";
import createTrackSchema, {
    updateTrackSchema,
} from "../middlewares/TrackMiddlewareValidation/track.validation.js";
import adminTrackController from "../controllers/admin.track.controller.js";
import adminTrackValidation from "../middlewares/Admin/admin.track.validation.js";
import {
    optionalAuthenticate,
    requireAdmin,
} from "../middlewares/Authentication/authentication.middleware.js";
import { requireArtist } from "../middlewares/Authentication/authentication.middleware.js";
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
    requireArtist,
    validate(createTrackSchema, "body"),
    artistTrackController.createTrack
);

router.get(
    "/artist/me",
    requireArtist,
    artistTrackController.getMyTracks
);

router.get(
    "/artist/me/:id",
    requireArtist,
    validate(trackValidation.trackIdParamSchema, "params"),
    artistTrackController.getMyTrackDetail
);

router.patch(
    "/artist/me/:id",
    requireArtist,
    validate(trackValidation.trackIdParamSchema, "params"),
    validate(updateTrackSchema, "body"),
    artistTrackController.updateMyTrack
);

router.patch(
    "/artist/me/:id/hide",
    requireArtist,
    validate(trackValidation.trackIdParamSchema, "params"),
    artistTrackController.hideMyTrack
);

router.patch(
    "/artist/me/:id/submit",
    requireArtist,
    validate(trackValidation.trackIdParamSchema, "params"),
    artistTrackController.submitMyTrack
);

router.delete(
    "/artist/me/:id",
    requireArtist,
    validate(trackValidation.trackIdParamSchema, "params"),
    artistTrackController.deleteMyTrack
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

// User routes
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

router.get(
    "/:id/playback",
    optionalAuthenticate(),
    validate(trackValidation.trackIdParamSchema, "params"),
    trackController.getTrackPlayback
);

export default router;
