import express from "express";
import transactionController from "../controllers/transaction.controller.js";
import authenticate from "../middlewares/Authentication/authentication.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import { transactionUserIdParamSchema } from "../middlewares/transaction.validation.js";

const router = express.Router();

/**
 * Admin xem toàn bộ giao dịch của một user
 * GET /api/transactions/user/:userId
 */
router.get(
    "/user/:userId",
    authenticate(),
    validate(transactionUserIdParamSchema, "params"),
    transactionController.getTransactionsByUserId
);


export default router;
