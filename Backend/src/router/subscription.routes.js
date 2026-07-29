import express from "express";
import subscriptionController from "../controllers/subscription.controller.js";
import authenticate from "../middlewares/Authentication/authentication.middleware.js";
import paymentValidation from "../middlewares/payment.validation.js";
import validate from "../middlewares/validate.middleware.js";

const router = express.Router();

router.get("/subscription-plans", subscriptionController.getActivePlans);
router.get("/subscription-plans/:id", subscriptionController.getActivePlanDetail);
router.get("/subscriptions/me", authenticate(), subscriptionController.getMySubscription);

router.post(
    "/payments/vnpay/create-order",
    authenticate(["user", "admin", "artist"]),
    validate(paymentValidation.createVnpayOrderSchema),
    subscriptionController.createVnpayOrder
);

router.get("/payments/vnpay/return", subscriptionController.handleVnpayReturn);
router.get("/payments/vnpay/ipn", subscriptionController.handleVnpayIpn);

export default router;
