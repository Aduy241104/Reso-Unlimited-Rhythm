import express from "express";
import adminTransactionController from "../controllers/admin.transaction.controller.js";
import { requireAdmin } from "../middlewares/Authentication/authentication.middleware.js";

const router = express.Router();

router.use(requireAdmin);

router.get("/", adminTransactionController.getTransactionList);

export default router;
