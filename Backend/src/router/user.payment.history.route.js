import express from "express";
import userPaymentHistoryController from "../controllers/user.payment.history.controller.js";
import authenticate from "../middlewares/Authentication/authentication.middleware.js";

const router = express.Router();

router.get("/", authenticate(), userPaymentHistoryController.getMyPaymentHistory);
router.get(
    "/:paymentId/receipt",
    authenticate(),
    userPaymentHistoryController.getPaymentReceiptPdf
);
router.get(
    "/:paymentId",
    authenticate(),
    userPaymentHistoryController.getPaymentDetail
);

export default router;
