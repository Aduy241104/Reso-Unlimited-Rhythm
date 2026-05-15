import multer from "multer";
import { AppError } from "../../utils/AppError.js";

const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
            cb(new AppError("Only image uploads are allowed.", 400));
            return;
        }

        cb(null, true);
    },
});

export const artistProfileMediaUpload = upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
]);

export const runArtistProfileMediaUpload = (req, res, next) => {
    artistProfileMediaUpload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                next(new AppError("Image file is too large (max 5MB).", 400));
                return;
            }

            next(new AppError(err.message, 400));
            return;
        }

        next(err);
    });
};
