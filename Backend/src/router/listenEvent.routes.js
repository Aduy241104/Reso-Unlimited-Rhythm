import express from "express";
import { authorizeRoles } from "../middlewares/Authentication/authentication.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import listenEventController from "../controllers/listenEvent.controller.js";
import listenEventValidation from "../middlewares/listenEvent.validation.js";

const router = express.Router();

router.post(
    "/complete",
    authorizeRoles("user", "artist"),
    validate(listenEventValidation.listenEventCompletionSchema, "body"),
    listenEventController.recordCompletedListenAttempt
);

export default router;
