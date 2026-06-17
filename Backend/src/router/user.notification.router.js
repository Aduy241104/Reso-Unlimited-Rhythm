import express from "express";
import userNotificationController from "../controllers/user.notification.controller.js";
import { requireUser } from "../middlewares/Authentication/authentication.middleware.js";
import notificationValidation from "../middlewares/notification.validation.js";
import validate from "../middlewares/validate.middleware.js";

const router = express.Router();

// 1. Lấy danh sách thông báo (Validate Query)
router.get(
    "/",
    requireUser,
    validate(notificationValidation.notificationListQuerySchema, "query"),
    userNotificationController.getMyNotifications
);

// 2. Lấy chi tiết thông báo (Validate Params ID)
router.get(
    "/:id",
    requireUser,
    validate(notificationValidation.notificationDetailParamsSchema, "params"),
    userNotificationController.getNotificationDetail
);

// 3. Đánh dấu đã đọc (Validate Params ID)
router.patch(
    "/:id/mark-as-read",
    requireUser,
    validate(notificationValidation.notificationDetailParamsSchema, "params"),
    userNotificationController.markAsRead
);

router.delete(
    "/:id",
    requireUser,
    validate(notificationValidation.notificationDetailParamsSchema, "params"),
    userNotificationController.deleteNotification
);

export default router;