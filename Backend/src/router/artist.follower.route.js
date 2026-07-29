import express from "express";
import artistFollowerController from "../controllers/artist.follower.controller.js";
import { requireArtist } from "../middlewares/Authentication/authentication.middleware.js";

const router = express.Router();

router.get("/followers", requireArtist, artistFollowerController.getArtistFollowers);

export default router;
