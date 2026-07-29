import express from "express";
import artistNotificationController from "../controllers/artist.notification.controller.js";
import { requireArtist } from "../middlewares/Authentication/authentication.middleware.js";
import artistNotificationValidation from "../middlewares/artist.notification.validation.js";
import validate from "../middlewares/validate.middleware.js";

const router = express.Router();

router.get(
    "/",
    requireArtist,
    validate(artistNotificationValidation.notificationListQuerySchema, "query"),
    artistNotificationController.getMyArtistNotifications
);

router.get(
    "/:id",
    requireArtist,
    validate(artistNotificationValidation.notificationDetailParamsSchema, "params"),
    artistNotificationController.getMyArtistNotificationDetail
);

export default router;
