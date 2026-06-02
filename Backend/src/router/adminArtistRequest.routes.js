import express from "express";
import adminArtistRequestValidation from "../middlewares/Admin/admin.artistRequest.validation.js";
import adminArtistRequestController from "../controllers/admin.artistRequest.controller.js";
import validate from "../middlewares/validate.middleware.js";

const router = express.Router();

router.get("/", adminArtistRequestController.getArtistRequests);
router.get("/:id", adminArtistRequestController.getArtistRequestDetail);
router.patch(
    "/:id/decision",
    validate(adminArtistRequestValidation.artistRequestIdParamSchema, "params"),
    validate(adminArtistRequestValidation.updateArtistRequestDecisionSchema),
    adminArtistRequestController.reviewArtistRequest
);

export default router;
