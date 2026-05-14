import express from "express";
import artistController from "../controllers/artist.controller.js";

const router = express.Router();

router.get("/:id/profile", artistController.getArtistProfile);
router.get("/:id/tracks", artistController.getArtistTracks);

export default router;
