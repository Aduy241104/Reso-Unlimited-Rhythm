import express from "express";
import multer from "multer";
import authenticate from "../middlewares/Authentication/authentication.middleware.js";
import copyrightClaimController from "../controllers/copyrightClaim.controller.js";
import { AppError } from "../utils/AppError.js";

const router = express.Router();
const storage = multer.memoryStorage();
const allowedMimeTypes = new Set([
    "application/pdf",
    "application/zip",
    "application/octet-stream",
    "audio/mpeg",
    "audio/wav",
    "audio/flac",
    "audio/mp4",
]);
const allowedBinaryExtensions = new Set([".pdf", ".zip", ".mp3", ".wav", ".flac", ".m4a"]);

const evidenceFileFilter = (req, file, cb) => {
    const extension = String(file.originalname || "").toLowerCase().replace(/^.*(\.[^.]*)$/, "$1");
    const isAllowedBinary = allowedMimeTypes.has(file.mimetype) &&
        file.mimetype !== "application/octet-stream"
        || (file.mimetype === "application/octet-stream" && allowedBinaryExtensions.has(extension));

    if (file.fieldname === "evidence" &&
        (file.mimetype.startsWith("image/") || isAllowedBinary)) {
        cb(null, true);
        return;
    }
    cb(new AppError("Only image, PDF, ZIP or audio evidence files are allowed.", 400), false);
};

const evidenceUpload = multer({
    storage,
    fileFilter: evidenceFileFilter,
    limits: { fileSize: 25 * 1024 * 1024, files: 5 },
}).fields([{ name: "evidence", maxCount: 5 }]);

const runEvidenceUpload = (req, res, next) => {
    evidenceUpload(req, res, (error) => {
        if (!error) return next();
        next(error instanceof AppError ? error : new AppError(error.message, 400));
    });
};

router.use(authenticate(["user", "artist", "admin"]));
router.get("/", copyrightClaimController.getMyClaims);
router.get("/:id", copyrightClaimController.getMyClaim);
router.post("/", runEvidenceUpload, copyrightClaimController.createClaim);
router.post("/:id/respond", runEvidenceUpload, copyrightClaimController.respondToClaim);
router.post("/:id/appeal", runEvidenceUpload, copyrightClaimController.appealClaim);

export default router;
