import express from "express";
import multer from "multer";
import userPlaylistController from "../controllers/user.playlist.controller.js";
import {
    optionalAuthenticate,
    requireUser,
} from "../middlewares/Authentication/authentication.middleware.js";
import { AppError } from "../utils/AppError.js";

const router = express.Router();
const multerUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype?.startsWith("image/")) {
            cb(new AppError("Only image uploads are allowed.", 400));
            return;
        }

        cb(null, true);
    },
});
const playlistCoverUpload = multerUpload.single("coverImage");

const runPlaylistCoverUpload = (req, res, next) => {
    playlistCoverUpload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                next(new AppError("Cover image file is too large.", 400));
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

router.post( "/", requireUser, runPlaylistCoverUpload, userPlaylistController.createMyPlaylist);

router.patch("/:id", requireUser, runPlaylistCoverUpload, userPlaylistController.updateMyPlaylist);
router.delete("/:id", requireUser, userPlaylistController.deleteMyPlaylist);
router.get("/", requireUser, userPlaylistController.getMyPlaylists);
router.get("/detail/:id", optionalAuthenticate(), userPlaylistController.getPlaylistDetail);

export default router;
