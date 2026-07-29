import express from "express";
import recommendationController from "../controllers/recommendation.controller.js";
import authenticate from "../middlewares/Authentication/authentication.middleware.js";

const router = express.Router();

router.get(
    "/daily-mixes",
    authenticate(),
    recommendationController.getDailyMixes
);

router.post(
    "/daily-mixes/rebuild",
    authenticate(),
    recommendationController.rebuildDailyMixes
);

export default router;
