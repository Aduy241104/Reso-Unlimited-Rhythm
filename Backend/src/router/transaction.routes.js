import express from "express";
import transactionController from "../controllers/transaction.controller.js";
import authenticate from "../middlewares/Authentication/authentication.middleware.js";

const router = express.Router();

/**
 * Admin xem toàn bộ giao dịch của một user
 * GET /api/transactions/user/:userId
 */
router.get(
    "/user/:userId",
    authenticate(),
    transactionController.getTransactionsByUserId
);


export default router;