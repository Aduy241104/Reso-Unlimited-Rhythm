import express from "express";
import adminPlaylistController from "../controllers/admin.playlist.controller.js";
import playlistController from "../controllers/playlist.controller.js";
import { requireAdmin } from "../middlewares/Authentication/authentication.middleware.js";
import adminPlaylistValidation from "../middlewares/Admin/admin.playlist.validation.js";
import validate from "../middlewares/validate.middleware.js";

const router = express.Router();

router.get("/system", playlistController.getSystemPlaylists);

router.post(
    "/system",
    requireAdmin,
    validate(adminPlaylistValidation.createSystemPlaylistSchema),
    adminPlaylistController.createSystemPlaylist
);

router.get("/detail/:id", playlistController.getPlaylistDetail);

export default router;
