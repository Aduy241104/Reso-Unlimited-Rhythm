import express from "express";
import multer from "multer";
import authenticate from "../middlewares/Authentication/authentication.middleware.js";
import artistRegistrationController from "../controllers/artist.registration.controller.js";
import { AppError } from "../utils/AppError.js";

const router = express.Router();

const artistRegistrationStorage = multer.memoryStorage();

const artistRegistrationFileFilter = (req, file, cb) => {
    if (
        (file.fieldname === "avatar" ||
            file.fieldname === "frontImage" ||
            file.fieldname === "backImage") &&
        file.mimetype.startsWith("image/")
    ) {
        cb(null, true);
        return;
    }

    cb(new AppError(`Invalid file type for ${file.fieldname}. Please upload an image file.`, 400), false);
};

const artistRegistrationUpload = multer({
    storage: artistRegistrationStorage,
    fileFilter: artistRegistrationFileFilter,
    limits: {
        fileSize: 500 * 1024 * 1024,
    },
}).fields([
    { name: "avatar", maxCount: 1 },
    { name: "frontImage", maxCount: 1 },
    { name: "backImage", maxCount: 1 },
]);

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
    runArtistRegistrationUpload,
    artistRegistrationController.requestArtistRegistration
);

export default router;
