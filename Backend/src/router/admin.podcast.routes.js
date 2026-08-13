import express from "express";
import adminPodcastController from "../controllers/admin.podcast.controller.js";
import validate from "../middlewares/validate.middleware.js";
import { requireAdmin } from "../middlewares/Authentication/authentication.middleware.js";
import {
    adminPodcastQuerySchema,
    blockPodcastSchema,
    podcastApprovalSchema,
    podcastReviewEventSchema,
    podcastIdParamSchema,
    rejectPodcastSchema,
} from "../middlewares/podcast.validation.js";

const router = express.Router();
router.use(requireAdmin);
router.get("/", validate(adminPodcastQuerySchema, "query"), adminPodcastController.list);
router.get("/:id", validate(podcastIdParamSchema, "params"), adminPodcastController.detail);
router.post("/:id/review/session", validate(podcastIdParamSchema, "params"), adminPodcastController.startReviewSession);
router.post("/:id/review/events", validate(podcastIdParamSchema, "params"), validate(podcastReviewEventSchema, "body"), adminPodcastController.recordReviewEvent);
router.post("/:id/approve", validate(podcastIdParamSchema, "params"), validate(podcastApprovalSchema, "body"), adminPodcastController.approve);
router.post("/:id/reject", validate(podcastIdParamSchema, "params"), validate(rejectPodcastSchema, "body"), adminPodcastController.reject);
router.post("/:id/block", validate(podcastIdParamSchema, "params"), validate(blockPodcastSchema, "body"), adminPodcastController.block);
router.post("/:id/unblock", validate(podcastIdParamSchema, "params"), adminPodcastController.unblock);

export default router;
