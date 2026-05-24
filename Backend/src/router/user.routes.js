import express from "express";
import userController from "../controllers/user.controller.js";
import authenticate from "../middlewares/Authentication/authentication.middleware.js";

const router = express.Router();

router.get("/me", authenticate(), userController.getMyProfile);

export default router;
