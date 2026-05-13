import express from "express";
import multer from "multer";
import artistProfileController from "../controllers/artistProfile.controller.js";
import { requireArtist } from "../middlewares/Authentication/authentication.middleware.js";
import artistProfileValidation from "../middlewares/artistProfile/artistProfile.validation.js";
import validate from "../middlewares/validate.middleware.js";
import { AppError } from "../utils/AppError.js";
import { StatusCodes } from "http-status-codes";

const router = express.Router();

const imageUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
            cb(new AppError("Only image files are allowed.", StatusCodes.BAD_REQUEST));
            return;
        }

        cb(null, true);
    },
});

const singleImage = imageUpload.single("file");

const handleUpload = (handler) => (req, res, next) => {
    singleImage(req, res, (err) => {
        if (err) {
            next(err);
            return;
        }

        handler(req, res, next);
    });
};

router.get("/", requireArtist, artistProfileController.getProfile);

router.patch(
    "/",
    requireArtist,
    validate(artistProfileValidation.patchArtistProfileSchema),
    artistProfileController.updateProfile
);

router.post("/verification-request", requireArtist, artistProfileController.requestVerification);

router.post(
    "/media/avatar",
    requireArtist,
    handleUpload(artistProfileController.uploadAvatar)
);

router.post(
    "/media/cover",
    requireArtist,
    handleUpload(artistProfileController.uploadCover)
);

export default router;
