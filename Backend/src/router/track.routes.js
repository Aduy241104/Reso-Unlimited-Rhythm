import express from "express";
import trackController from "../controllers/track.controller.js";
import trackValidation from "../middlewares/track.validation.js";
import { updateTrackSchema } from "../middlewares/TrackMiddlewareValidation/track.validation.js";
import adminTrackValidation from "../middlewares/Admin/admin.track.validation.js";
import validate from "../middlewares/validate.middleware.js";
import { optionalAuthenticate } from "../middlewares/Authentication/authentication.middleware.js";
import { requireAdmin, requireArtist } from "../middlewares/Authentication/authentication.middleware.js";
import artistTrackController from "../controllers/artist.track.controller.js";
import adminTrackController from "../controllers/admin.track.controller.js";

const router = express.Router();

// Giờ không sợ bị trùng /admin nữa, viết thoải mái nhé bạn

// GET /:id
router.get(
    "/top/monthly",
    validate(trackValidation.monthlyTopTracksQuerySchema, "query"),
    trackController.getMonthlyTopTracks
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

// lyrics management moved to separate lyrics routes

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