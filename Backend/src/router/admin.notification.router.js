import express from "express";
import adminNotificationController from "../controllers/admin.notification.controller.js";
import adminNotificationValidation from "../middlewares/Admin/admin.notification.validation.js";
import validate from "../middlewares/validate.middleware.js";
import { requireAdmin } from "../middlewares/Authentication/authentication.middleware.js";

const router = express.Router();

// Tất cả các route bên dưới đều bắt buộc phải là Admin
router.use(requireAdmin);

// POST /api/admin/notifications - Tạo và gửi thông báo
router.post(
    "/",
    validate(adminNotificationValidation.createNotificationSchema, "body"),
    adminNotificationController.createNotificationForAdmin
);

export default router;