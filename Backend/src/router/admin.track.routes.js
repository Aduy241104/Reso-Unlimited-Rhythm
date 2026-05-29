import express from "express";
import adminTrackController from "../controllers/admin.track.controller.js";
import adminTrackValidation from "../middlewares/Admin/admin.track.validation.js";
import trackValidation from "../middlewares/track.validation.js";
import validate from "../middlewares/validate.middleware.js";
import { requireAdmin } from "../middlewares/Authentication/authentication.middleware.js";

const router = express.Router();

// Áp dụng requireAdmin cho TOÀN BỘ routes trong file này
router.use(requireAdmin);

// LƯU Ý: Đã bỏ chữ "/admin" ở tiền tố vì ta sẽ cấu hình nó lúc mount router
// GET / (Tương đương /admin cũ)
router.get(
    "/", 
    adminTrackController.listTracksForAdmin
);

// PATCH /:id/approval (Tương đương /admin/:id/approval cũ)
router.patch(
    "/:id/approval",
    validate(trackValidation.trackIdParamSchema, "params"),
    validate(adminTrackValidation.updateTrackApprovalSchema, "body"),
    adminTrackController.updateTrackApprovalStatus
);

// PATCH /:id/visibility (Tương đương /admin/:id/visibility cũ)
router.patch(
    "/:id/visibility",
    validate(trackValidation.trackIdParamSchema, "params"),
    validate(adminTrackValidation.updateTrackVisibilitySchema, "body"),
    adminTrackController.updateTrackVisibilityController
);

export default router;