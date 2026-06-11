import express from "express";
import adminTransactionController from "../controllers/admin.transaction.controller.js";
import { requireAdmin } from "../middlewares/Authentication/authentication.middleware.js";

const router = express.Router();

// Tất cả các route quản lý transaction này đều bắt buộc phải là Admin
router.use(requireAdmin);

// GET /api/admin/transactions
router.get("/", adminTransactionController.listTransactionsForAdmin);

export default router;