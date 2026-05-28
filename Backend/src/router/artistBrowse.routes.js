import express from "express";
import artistController from "../controllers/artistBrowse.controller.js";
import artistBrowseValidation from "../middlewares/artistBrowse.validation.js";
import validate from "../middlewares/validate.middleware.js";

const router = express.Router();

router.get(
    "/top/daily",
    validate(artistBrowseValidation.dailyTopArtistsQuerySchema, "query"),
    artistController.getDailyTopArtists
);

router.get(
    "/top/monthly",
    validate(artistBrowseValidation.monthlyTopArtistsQuerySchema, "query"),
    artistController.getMonthlyTopArtists
);

router.get("/:id/profile", artistController.getArtistProfile);
router.get("/:id/albums", artistController.getArtistAlbums);
router.get("/:id/coming-releases", artistController.getArtistComingReleases);
router.get("/:id/tracks", artistController.getArtistTracks);

export default router;
