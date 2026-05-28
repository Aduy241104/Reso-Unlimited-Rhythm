import express from "express";
import multer from "multer";
import userController from "../controllers/user.controller.js";
import authenticate from "../middlewares/Authentication/authentication.middleware.js";
import upload from "../middlewares/upload.middleware.js";
import { AppError } from "../utils/AppError.js";

const router = express.Router();
const userAvatarUpload = upload.single("avatar");

const runUserAvatarUpload = (req, res, next) => {
    userAvatarUpload(req, res, (err) => {
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

router.get("/me", authenticate(), userController.getMyProfile);
router.patch("/me", authenticate(), runUserAvatarUpload, userController.updateMyProfile);

export default router;
