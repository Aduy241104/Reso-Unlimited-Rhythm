import express from "express";
import advertisementController from "../controllers/advertisement.controller.js";
import { optionalAuthenticate } from "../middlewares/Authentication/authentication.middleware.js";
import { advertisementRateLimit } from "../middlewares/advertisementRateLimit.middleware.js";

const router = express.Router();
router.post("/decision", advertisementRateLimit({ max: 60 }), optionalAuthenticate(), advertisementController.decide);
router.post("/events", advertisementRateLimit({ max: 120 }), optionalAuthenticate(), advertisementController.recordEvent);
export default router;
