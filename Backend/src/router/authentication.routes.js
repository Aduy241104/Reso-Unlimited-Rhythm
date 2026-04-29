import express from "express";
import authenticationController from "../controllers/authentication.controller.js";
import authenticationValidation from "../middlewares/Authentication/authentication.validation.js";
import validate from "../middlewares/validate.middleware.js";

const router = express.Router();

router.post(
    "/login",
    validate(authenticationValidation.loginSchema),
    authenticationController.login
);

router.post(
    "/register",
    validate(authenticationValidation.registerSchema),
    authenticationController.register
);

router.post(
    "/register/send-otp",
    validate(authenticationValidation.requestRegisterOtpSchema),
    authenticationController.requestRegisterOtp
);

router.post(
    "/logout",
    authenticationController.logout
);

export default router;
