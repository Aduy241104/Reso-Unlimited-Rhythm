import express from "express";
import userSubscriptionController from "../controllers/user.subscription.controller.js";
import authenticate from "../middlewares/Authentication/authentication.middleware.js";

const router = express.Router();

router.get(
    "/status",
    authenticate(),
    userSubscriptionController.getSubscriptionStatus
);

export default router;
