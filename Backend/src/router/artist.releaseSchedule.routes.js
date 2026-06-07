import express from "express";
import artistReleaseScheduleController from "../controllers/artist.releaseSchedule.controller.js";
import { requireArtist } from "../middlewares/Authentication/authentication.middleware.js";

const router = express.Router();

router.get(
    "/",
    requireArtist,
    artistReleaseScheduleController.getMyReleaseSchedules
);

export default router;
