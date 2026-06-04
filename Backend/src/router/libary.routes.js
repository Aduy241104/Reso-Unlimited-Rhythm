import express from "express";
import libaryController from "../controllers/libary.controller.js";
import authenticate, { requireUser } from "../middlewares/Authentication/authentication.middleware.js";

const router = express.Router();

router.get("/followed-artists", requireUser, libaryController.getMyFollowedArtists);
router.get("/followed-albums", requireUser, libaryController.getMyFollowedAlbums);

export default router;
