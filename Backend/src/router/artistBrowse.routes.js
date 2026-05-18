import express from "express";
import artistController from "../controllers/artistBrowse.controller.js";

const router = express.Router();

router.get("/:id/profile", artistController.getArtistProfile);
router.get("/:id/albums", artistController.getArtistAlbums);
router.get("/:id/coming-releases", artistController.getArtistComingReleases);
router.get("/:id/tracks", artistController.getArtistTracks);

export default router;
