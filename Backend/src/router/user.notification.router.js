import express from "express";
import userNotificationController from "../controllers/user.notification.controller.js";
import { authorizeRoles } from "../middlewares/Authentication/authentication.middleware.js";
import notificationValidation from "../middlewares/notification.validation.js";
import validate from "../middlewares/validate.middleware.js";

const router = express.Router();
const requireNotificationViewer = authorizeRoles("user", "artist", "admin");

// 1. Lấy danh sách thông báo (Validate Query)
router.get(
    "/",
    requireNotificationViewer,
    validate(notificationValidation.notificationListQuerySchema, "query"),
    userNotificationController.getMyNotifications
);

// 2. Lấy chi tiết thông báo (Validate Params ID)
router.get(
    "/:id",
    requireNotificationViewer,
    validate(notificationValidation.notificationDetailParamsSchema, "params"),
    userNotificationController.getNotificationDetail
);

// 3. Đánh dấu đã đọc (Validate Params ID)
router.patch(
    "/:id/mark-as-read",
    requireNotificationViewer,
    validate(notificationValidation.notificationDetailParamsSchema, "params"),
    userNotificationController.markAsRead
);

router.delete(
    "/:id",
    requireNotificationViewer,
    validate(notificationValidation.notificationDetailParamsSchema, "params"),
    userNotificationController.deleteNotification
);

export default router;
