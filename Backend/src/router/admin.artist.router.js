import express from "express";
import adminArtistController from "../controllers/admin.artist.controller.js";
import adminArtistValidation from "../middlewares/Admin/admin.artist.validation.js";
import validate from "../middlewares/validate.middleware.js";
import { requireAdmin } from "../middlewares/Authentication/authentication.middleware.js";

const router = express.Router();

// Tất cả route trong file này đều cần quyền Admin
router.use(requireAdmin);

// GET /api/admin/artists
router.get(
    "/",
    adminArtistController.listArtistsForAdmin
);

router.get(
    "/:id",
    validate(adminArtistValidation.artistIdParamSchema, "params"),
    adminArtistController.getArtistDetailForAdmin
);


export default router;