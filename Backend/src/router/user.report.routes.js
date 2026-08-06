import express from "express";
import multer from "multer";
import authenticate from "../middlewares/Authentication/authentication.middleware.js";
import userReportController from "../controllers/user.report.controller.js";
import { AppError } from "../utils/AppError.js";

const router = express.Router();

const allowUserOrArtist = (req, res, next) => {
  const authMiddleware = authenticate();
  return authMiddleware(req, res, (err) => {
    if (err) return next(err);
    const role = String(req.user?.role || "").toLowerCase();
    if (role === "user" || role === "artist" || role === "admin") {
      return next();
    }
    return next(new AppError("You do not have permission to access this resource.", 403));
  });
};

const reportStorage = multer.memoryStorage();

const reportFileFilter = (req, file, cb) => {
  if (file.fieldname === "images" && file.mimetype.startsWith("image/")) {
    cb(null, true);
    return;
  }

  cb(
    new AppError(
      `Invalid file type for ${file.fieldname}. Please upload an image file.`,
      400
    ),
    false
  );
};

const reportUpload = multer({
  storage: reportStorage,
  fileFilter: reportFileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024,
    files: 5,
  },
}).fields([{ name: "images", maxCount: 5 }]);

const runReportUpload = (req, res, next) => {
  reportUpload(req, res, (err) => {
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

router.get(
  "/reports",
  allowUserOrArtist,
  userReportController.getMyReports
);
router.get(
  "/reports/:id",
  allowUserOrArtist,
  userReportController.getMyReportDetail
);
router.post(
  "/reports",
  allowUserOrArtist,
  runReportUpload,
  userReportController.createReport
);

export default router;
