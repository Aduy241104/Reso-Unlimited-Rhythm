import express from "express";
import artistController from "../controllers/artist.controller.js";
import { requireArtist } from "../middlewares/Authentication/authentication.middleware.js";
import { runArtistProfileMediaUpload } from "../middlewares/artist/artist.mediaUpload.middleware.js";
import artistValidation from "../middlewares/artist/artist.validation.js";
import validate from "../middlewares/validate.middleware.js";

const router = express.Router();

router.get("/me", requireArtist, artistController.getMyProfile);

router.patch(
    "/me/media",
    requireArtist,
    runArtistProfileMediaUpload,
    artistController.updateMyProfileMedia
);

router.patch(
    "/me",
    requireArtist,
    validate(artistValidation.updateMyProfileSchema),
    artistController.updateMyProfile
);

export default router;
