import express from "express";
import controller from "../controllers/admin.trackReviewAppeal.controller.js";
import validation from "../middlewares/trackReviewAppeal.validation.js";
import validate from "../middlewares/validate.middleware.js";

const router = express.Router();

router.get(
    "/",
    validate(validation.adminTrackReviewAppealsQuerySchema, "query"),
    controller.listAppeals
);
router.get(
    "/:appealId",
    validate(validation.appealIdParamSchema, "params"),
    controller.getAppeal
);
router.post(
    "/:appealId/accept",
    validate(validation.appealIdParamSchema, "params"),
    validate(validation.adminAcceptTrackReviewAppealSchema, "body"),
    controller.acceptAppeal
);
router.post(
    "/:appealId/reject",
    validate(validation.appealIdParamSchema, "params"),
    validate(validation.adminRejectTrackReviewAppealSchema, "body"),
    controller.rejectAppeal
);

export default router;
