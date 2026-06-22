import express from "express";
import adminNotificationController from "../controllers/admin.notification.controller.js";
import adminNotificationValidation from "../middlewares/Admin/admin.notification.validation.js";
import validate from "../middlewares/validate.middleware.js";
import { requireAdmin } from "../middlewares/Authentication/authentication.middleware.js";

const router = express.Router();

router.use(requireAdmin);

router.post(
    "/",
    validate(adminNotificationValidation.createNotificationSchema, "body"),
    adminNotificationController.createNotificationForAdmin
);

router.get(
    "/",
    adminNotificationController.getNotificationsForAdmin
);

router.get(
    "/:id",
    adminNotificationController.getNotificationDetailForAdmin
);

router.patch("/:id", adminNotificationController.updateNotificationForAdmin);


router.delete("/:id", adminNotificationController.deleteNotificationForAdmin);

export default router;