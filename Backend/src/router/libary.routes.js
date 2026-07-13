import express from "express";
import libaryController from "../controllers/libary.controller.js";
import authenticate, { requireUser } from "../middlewares/Authentication/authentication.middleware.js";

const router = express.Router();

router.get("/followed-artists", authenticate(["user", "artist"]), libaryController.getMyFollowedArtists);
router.get("/followed-albums",authenticate(["user", "artist"]),libaryController.getMyFollowedAlbums);

export default router;
