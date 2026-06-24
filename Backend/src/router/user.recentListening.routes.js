import express from "express";
import authenticate from "../middlewares/Authentication/authentication.middleware.js";
import userRecentListeningController from "../controllers/user.recentListening.controller.js";

const router = express.Router();

router.get(
    "/me/recent-listening-activity",
    authenticate(["user", "artist"]),
    userRecentListeningController.getMyRecentListeningActivity
);

export default router;
