import express from "express";
import artistReleaseScheduleController from "../controllers/artist.releaseSchedule.controller.js";
import artistReleaseScheduleValidation from "../middlewares/artist.releaseSchedule.validation.js";
import { requireArtist } from "../middlewares/Authentication/authentication.middleware.js";
import validate from "../middlewares/validate.middleware.js";

const router = express.Router();

router.post(
    "/",
    requireArtist,
    validate(artistReleaseScheduleValidation.createReleaseScheduleSchema),
    artistReleaseScheduleController.createMyReleaseSchedule
);

router.get(
    "/",
    requireArtist,
    artistReleaseScheduleController.getMyReleaseSchedules
);

export default router;
