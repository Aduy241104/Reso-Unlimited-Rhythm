import express from "express";
import adminAlbumController from "../controllers/admin.album.controller.js";
import adminAlbumValidation from "../middlewares/Admin/admin.album.validation.js";
import validate from "../middlewares/validate.middleware.js";
import { requireAdmin } from "../middlewares/Authentication/authentication.middleware.js";

const router = express.Router();

router.use(requireAdmin);

router.get(
    "/",
    validate(adminAlbumValidation.listAlbumsQuerySchema, "query"),
    adminAlbumController.listAlbumsForAdmin
);

router.get(
    "/:id",
    validate(adminAlbumValidation.albumIdParamSchema, "params"),
    adminAlbumController.getAlbumDetailForAdmin
);

router.patch(
    "/:id/status",
    validate(adminAlbumValidation.albumIdParamSchema, "params"),
    validate(adminAlbumValidation.updateAlbumStatusSchema, "body"),
    adminAlbumController.updateAlbumStatusForAdmin
);

export default router;
