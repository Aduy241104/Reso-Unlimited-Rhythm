import express from "express";
import userPlaylistController from "../controllers/user.playlist.controller.js";
import { requireUser } from "../middlewares/Authentication/authentication.middleware.js";

const router = express.Router();

router.get("/", requireUser, userPlaylistController.getMyPlaylists);
router.get("/detail/:id", userPlaylistController.getPlaylistDetail);

export default router;