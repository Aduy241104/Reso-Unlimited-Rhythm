import multer from "multer";
import { AppError } from "../../utils/AppError.js";
import { validateEvidenceUploadFile, MAX_EVIDENCE_DOCUMENTS, MAX_EVIDENCE_SIZE } from "../../services/Track/copyright.validation.service.js";

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_EVIDENCE_SIZE, files: MAX_EVIDENCE_DOCUMENTS },
    fileFilter: (req, file, callback) => {
        // Multer's fileFilter runs before the in-memory buffer and final size are available.
        const error = validateEvidenceUploadFile({ ...file, buffer: Buffer.from([1]), size: 1 });
        if (error) {
            callback(new AppError(error, 400, { field: "evidence" }));
            return;
        }
        callback(null, true);
    },
}).array("evidence", MAX_EVIDENCE_DOCUMENTS);

export const runArtistCopyrightEvidenceUpload = (req, res, next) => {
    upload(req, res, (error) => {
        if (!error) return next();
        if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
            return next(new AppError("Mỗi tài liệu không được vượt quá 25 MB.", 400, { field: "evidence" }));
        }
        return next(error instanceof AppError ? error : new AppError(error.message, 400, { field: "evidence" }));
    });
};
