import express from "express";
import playlistController from "../controllers/playlist.controller.js";

const router = express.Router();

router.get("/system", playlistController.getSystemPlaylists);
router.get("/detail/:id", playlistController.getPlaylistDetail);

export default router;
