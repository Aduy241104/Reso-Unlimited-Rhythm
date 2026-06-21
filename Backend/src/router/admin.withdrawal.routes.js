import express from "express";
import adminWithdrawalController from "../controllers/admin.withdrawal.controller.js";
import adminWithdrawalValidation from "../middlewares/Admin/admin.withdrawal.validation.js";
import validate from "../middlewares/validate.middleware.js";

const router = express.Router();

router.get(
    "/",
    validate(adminWithdrawalValidation.listWithdrawalRequestsQuerySchema, "query"),
    adminWithdrawalController.getWithdrawalRequests
);

export default router;
