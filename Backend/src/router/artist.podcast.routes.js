import express from "express";
import podcastController from "../controllers/podcast.controller.js";
import upload from "../middlewares/upload.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import { requireArtist } from "../middlewares/Authentication/authentication.middleware.js";
import {
    artistPodcastQuerySchema,
    createPodcastSchema,
    podcastIdParamSchema,
    updatePodcastSchema,
    visibilitySchema,
} from "../middlewares/podcast.validation.js";

const router = express.Router();
router.use(requireArtist);

router.post(
    "/upload",
    upload.fields([{ name: "audio", maxCount: 1 }, { name: "coverImage", maxCount: 1 }]),
    podcastController.uploadPodcastFiles
);
router.get("/", validate(artistPodcastQuerySchema, "query"), podcastController.listArtistPodcasts);
router.post("/", validate(createPodcastSchema, "body"), podcastController.createPodcast);
router.get("/:id", validate(podcastIdParamSchema, "params"), podcastController.getArtistPodcast);
router.patch("/:id", validate(podcastIdParamSchema, "params"), validate(updatePodcastSchema, "body"), podcastController.updateArtistPodcast);
router.post("/:id/submit", validate(podcastIdParamSchema, "params"), podcastController.submitArtistPodcast);
router.patch("/:id/visibility", validate(podcastIdParamSchema, "params"), validate(visibilitySchema, "body"), podcastController.setPodcastVisibility);
router.delete("/:id", validate(podcastIdParamSchema, "params"), podcastController.deleteArtistPodcast);

export default router;
