import express from "express";
import trackController from "../controllers/track.controller.js";
import trackValidation from "../middlewares/track.validation.js";
import validate from "../middlewares/validate.middleware.js";
import { optionalAuthenticate } from "../middlewares/Authentication/authentication.middleware.js";

const router = express.Router({ mergeParams: true });

router.post(
    "/",
    optionalAuthenticate(),
    validate(trackValidation.trackIdParamSchema, "params"),
    trackController.recordListen
);

export default router;
