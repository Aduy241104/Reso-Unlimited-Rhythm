import express from "express";
import trackController from "../controllers/track.controller.js";
import uploadController from "../controllers/upload.controller.js";
import authenticate from "../middlewares/Authentication/authentication.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import createTrackSchema from "../middlewares/TrackMiddlewareValidation/track.validation.js";
import upload from "../middlewares/upload.middleware.js";

const router = express.Router();

// Upload files (Artist only)
router.post(
  "/upload",
  authenticate("artist"),
  upload.fields([
    { name: "audioFiles", maxCount: 10 },
    { name: "avatar", maxCount: 1 },
    { name: "coverImages", maxCount: 5 },
  ]),
  uploadController
);
router.post(
    "/",
    authenticate("artist"),
    validate(createTrackSchema, "body"),
    trackController.createTrack
);

export default router;
