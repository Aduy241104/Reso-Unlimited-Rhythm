import express from "express";
import podcastController from "../controllers/podcast.controller.js";
import validate from "../middlewares/validate.middleware.js";
import { optionalAuthenticate } from "../middlewares/Authentication/authentication.middleware.js";
import { listenPodcastSchema, podcastIdParamSchema, publicPodcastQuerySchema } from "../middlewares/podcast.validation.js";

const router = express.Router();
router.get("/", validate(publicPodcastQuerySchema, "query"), podcastController.listPodcasts);
router.get("/:id", optionalAuthenticate(), validate(podcastIdParamSchema, "params"), podcastController.getPodcast);
router.post("/:id/listen", optionalAuthenticate(), validate(podcastIdParamSchema, "params"), validate(listenPodcastSchema, "body"), podcastController.listen);

export default router;
