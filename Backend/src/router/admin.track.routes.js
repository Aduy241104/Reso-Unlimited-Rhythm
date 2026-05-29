import express from "express";
import adminTrackController from "../controllers/admin.track.controller.js";
import adminTrackValidation from "../middlewares/Admin/admin.track.validation.js";
import { requireAdmin } from "../middlewares/Authentication/authentication.middleware.js";
import trackValidation from "../middlewares/track.validation.js";
import validate from "../middlewares/validate.middleware.js";

const router = express.Router();

router.use(requireAdmin);

router.get(
    "/admin",
    adminTrackController.listTracksForAdmin
);

router.patch(
    "/admin/:id/approval",
    validate(trackValidation.trackIdParamSchema, "params"),
    validate(adminTrackValidation.updateTrackApprovalSchema, "body"),
    adminTrackController.updateTrackApprovalStatus
);

router.patch(
    "/admin/:id/visibility",
    validate(trackValidation.trackIdParamSchema, "params"),
    validate(adminTrackValidation.updateTrackVisibilitySchema, "body"),
    adminTrackController.updateTrackVisibilityController
);

export default router;
