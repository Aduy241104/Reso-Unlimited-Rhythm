import express from "express";
import adminReportController from "../controllers/admin.report.controller.js";
import { requireAdmin } from "../middlewares/Authentication/authentication.middleware.js";

const router = express.Router();

router.use(requireAdmin);

router.get("/", adminReportController.getReports);
router.get("/:id", adminReportController.getReportDetail);
router.patch("/:id/status", adminReportController.updateReportStatus);

export default router;
