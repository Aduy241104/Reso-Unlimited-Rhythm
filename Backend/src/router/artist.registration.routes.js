import express from "express";
import multer from "multer";
import authenticate from "../middlewares/Authentication/authentication.middleware.js";
import upload from "../middlewares/upload.middleware.js";
import artistRegistrationController from "../controllers/artist.registration.controller.js";
import { AppError } from "../utils/AppError.js";

const router = express.Router();

const remapArtistRegistrationImageFields = (req, res, next) => {
    if (!Array.isArray(req.body)) {
        next();
        return;
    }

    req.body = req.body.map((entry) => {
        if (entry?.name === "frontImage") {
            return { ...entry, name: "coverImage" };
        }

        if (entry?.name === "backImage") {
            return { ...entry, name: "coverImages" };
        }

        return entry;
    });

    next();
};

const artistRegistrationUpload = upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
    { name: "coverImages", maxCount: 1 },
]);

const restoreArtistRegistrationFiles = (req, res, next) => {
    req.files = {
        ...(req.files ?? {}),
        frontImage: req.files?.coverImage ?? [],
        backImage: req.files?.coverImages ?? [],
    };

    next();
};

const runArtistRegistrationUpload = (req, res, next) => {
    artistRegistrationUpload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                next(new AppError("Image file is too large.", 400));
                return;
            }

            next(new AppError(err.message, 400));
            return;
        }

        if (err) {
            next(err instanceof AppError ? err : new AppError(err.message, 400));
            return;
        }

        next();
    });
};

router.post(
    "/artist-registration-requests",
    authenticate("user"),
    remapArtistRegistrationImageFields,
    runArtistRegistrationUpload,
    restoreArtistRegistrationFiles,
    artistRegistrationController.requestArtistRegistration
);

export default router;
