import express from "express";
import multer from "multer";
import userPlaylistController from "../controllers/user.playlist.controller.js";
import { requireUser } from "../middlewares/Authentication/authentication.middleware.js";
import { AppError } from "../utils/AppError.js";

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
            return cb(new Error("Cover image must be an image file."));
        }

        cb(null, true);
    },
});

router.post("/", requireUser, upload.single("coverImage"), userPlaylistController.createMyPlaylist);
router.get("/", requireUser, userPlaylistController.getMyPlaylists);
router.get("/detail/:id", userPlaylistController.getPlaylistDetail);

export default router;
