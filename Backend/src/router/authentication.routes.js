import express from "express";
import authenticationController from "../controllers/authentication.controller.js";
import authenticate from "../middlewares/Authentication/authentication.middleware.js";
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
    "/forgot-password",
    validate(authenticationValidation.forgotPasswordSchema),
    authenticationController.forgotPassword
);

router.post(
    "/reset-password",
    validate(authenticationValidation.resetPasswordSchema),
    authenticationController.resetPassword
);

router.post(
    "/logout",
    authenticationController.logout
);

router.post(
    "/refresh-token",
    validate(authenticationValidation.refreshTokenCookieSchema, "cookies"),
    authenticationController.refreshToken
);

router.get(
    "/me",
    authenticate(),
    authenticationController.me
);


export default router;
