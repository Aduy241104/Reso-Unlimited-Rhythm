import express from "express";
import artistController from "../controllers/artist.controller.js";
import artistAlbumController from "../controllers/artist.album.controller.js";
import { requireArtist } from "../middlewares/Authentication/authentication.middleware.js";
import { runArtistProfileMediaUpload } from "../middlewares/artist/artist.mediaUpload.middleware.js";
import artistValidation from "../middlewares/artist/artist.validation.js";
import validate from "../middlewares/validate.middleware.js";
import upload from "../middlewares/upload.middleware.js";

const router = express.Router();

router.get("/me", requireArtist, artistController.getMyProfile);
router.get("/albums", requireArtist, artistAlbumController.getMyAlbums);
router.post("/albums", requireArtist, upload.single("coverImage"), artistAlbumController.createAlbum);
router.patch("/albums/:id", requireArtist, upload.single("coverImage"), artistAlbumController.updateAlbum);
router.patch("/albums/:id/hide", requireArtist, artistAlbumController.hideAlbum);
router.patch("/albums/:id/unhide", requireArtist, artistAlbumController.unhideAlbum);
router.post("/albums/:id/tracks", requireArtist, artistAlbumController.addTrackToAlbum);
router.get("/albums/:id", requireArtist, artistAlbumController.getMyAlbumDetail);

router.post(
    "/me/verification-request",
    requireArtist,
    validate(artistValidation.requestVerificationSchema),
    artistController.requestVerification
);

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
