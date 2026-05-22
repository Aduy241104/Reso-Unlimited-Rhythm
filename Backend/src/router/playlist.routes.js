import express from "express";
import adminPlaylistController from "../controllers/admin.playlist.controller.js";
import playlistController from "../controllers/playlist.controller.js";
import { requireAdmin } from "../middlewares/Authentication/authentication.middleware.js";
import adminPlaylistValidation from "../middlewares/Admin/admin.playlist.validation.js";
import validate from "../middlewares/validate.middleware.js";
import upload from "../middlewares/upload.middleware.js";

const router = express.Router();

// User routes
router.get("/system", playlistController.getSystemPlaylists);

router.get("/system/detail/:id", playlistController.getPlaylistDetail);

// Admin routes
router.get(
    "/admin/system",
    requireAdmin,
    adminPlaylistController.getSystemPlaylists
);

router.post(
    "/system",
    requireAdmin,
    validate(adminPlaylistValidation.createSystemPlaylistSchema),
    adminPlaylistController.createSystemPlaylist
);

router.get(
    "/admin/system/:playlistId",
    requireAdmin,
    adminPlaylistController.getSystemPlaylistDetail
);

router.patch(
    "/admin/system/:playlistId",
    requireAdmin,
    validate(adminPlaylistValidation.updateSystemPlaylistSchema),
    adminPlaylistController.updateSystemPlaylist
);

router.post(
    "/admin/system/:playlistId/tracks/batch",
    requireAdmin,
    validate(adminPlaylistValidation.addTracksBatchSchema),
    adminPlaylistController.addTracksToSystemPlaylistBatch
);

router.post(
    "/admin/system/:playlistId/tracks",
    requireAdmin,
    validate(adminPlaylistValidation.addTrackToSystemPlaylistSchema),
    adminPlaylistController.addTrackToSystemPlaylist
);

router.delete(
    "/admin/system/:playlistId/tracks/:trackId",
    requireAdmin,
    adminPlaylistController.removeTrackFromSystemPlaylist
);

router.delete(
    "/admin/system/:playlistId",
    requireAdmin,
    adminPlaylistController.deleteSystemPlaylist
);

router.post(
    "/admin/system/:playlistId/cover",
    requireAdmin,
    upload.single("coverImage"),
    adminPlaylistController.uploadSystemPlaylistCover
);

router.delete(
    "/admin/system/:playlistId/cover",
    requireAdmin,
    adminPlaylistController.deleteSystemPlaylistCover
);

router.get("/detail/:id", playlistController.getPlaylistDetail);


export default router;
