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

router.post(
    "/:id/review/session",
    validate(trackValidation.trackIdParamSchema, "params"),
    adminTrackController.startTrackReviewSession
);

router.get(
    "/:id/review/session",
    validate(trackValidation.trackIdParamSchema, "params"),
    adminTrackController.getTrackReviewSession
);

router.post(
    "/:id/review/events",
    validate(trackValidation.trackIdParamSchema, "params"),
    validate(adminTrackValidation.reviewEventSchema, "body"),
    adminTrackController.recordTrackReviewEvent
);

router.post(
    "/:id/fingerprint/reprocess",
    validate(trackValidation.trackIdParamSchema, "params"),
    adminTrackController.reprocessFingerprint
);

router.get(
    "/fingerprint-matches",
    validate(adminTrackValidation.fingerprintMatchesQuerySchema, "query"),
    adminTrackController.listFingerprintMatches
);
router.get(
    "/fingerprint-matches/:matchId",
    validate(adminTrackValidation.fingerprintMatchIdParamSchema, "params"),
    adminTrackController.getFingerprintMatchDetail
);
router.post(
    "/fingerprint-matches/:matchId/review",
    validate(adminTrackValidation.fingerprintMatchIdParamSchema, "params"),
    validate(adminTrackValidation.fingerprintReviewBodySchema, "body"),
    adminTrackController.reviewFingerprintMatch
);
router.get("/fingerprint-metrics", adminTrackController.getFingerprintMetrics);

// PATCH /:id/visibility (Tương đương /admin/:id/visibility cũ)
router.patch(
    "/:id/visibility",
    validate(trackValidation.trackIdParamSchema, "params"),
    validate(adminTrackValidation.updateTrackVisibilitySchema, "body"),
    adminTrackController.updateTrackVisibilityController
);

// GET /:id (Ví dụ: GET /api/admin/tracks/665efab12...)
router.get(
    "/:id",
    validate(trackValidation.trackIdParamSchema, "params"),
    adminTrackController.getTrackDetailForAdmin
);

export default router;
