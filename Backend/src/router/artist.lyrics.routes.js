import express from "express";
import lyricsController from "../controllers/artist.lyrics.controller.js";
import trackValidation from "../middlewares/track.validation.js";
import { requireArtist } from "../middlewares/Authentication/authentication.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import { addLyricsStaticSchema } from "../middlewares/TrackMiddlewareValidation/track.validation.js";
import upload from "../middlewares/upload.middleware.js";

const router = express.Router();

router.patch(
    "/artist/me/:id/lyrics-static",
    requireArtist,
    validate(trackValidation.trackIdParamSchema, "params"),
    validate(addLyricsStaticSchema, "body"),
    lyricsController.addStaticLyrics
);

router.patch(
    "/artist/me/:id/lyrics-sync",
    requireArtist,
    validate(trackValidation.trackIdParamSchema, "params"),
    upload.single("lyricsSync"),
    lyricsController.updateSyncLyrics
);

export default router;
