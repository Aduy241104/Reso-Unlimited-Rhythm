import express from "express";
import notificationController from "../controllers/notification.controller.js";
import { requireUser } from "../middlewares/Authentication/authentication.middleware.js";
import notificationValidation from "../middlewares/notification.validation.js";
import validate from "../middlewares/validate.middleware.js";

const router = express.Router();

router.get(
    "/",
    requireUser,
    validate(notificationValidation.notificationListQuerySchema, "query"),
    notificationController.getMyNotifications
);

export default router;
