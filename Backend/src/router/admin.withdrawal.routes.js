import express from "express";
import adminWithdrawalController from "../controllers/admin.withdrawal.controller.js";
import adminWithdrawalValidation from "../middlewares/Admin/admin.withdrawal.validation.js";
import validate from "../middlewares/validate.middleware.js";

const router = express.Router();
const withdrawalRequestRouter = express.Router();

router.get(
    "/",
    validate(adminWithdrawalValidation.listWithdrawalRequestsQuerySchema, "query"),
    adminWithdrawalController.getWithdrawalRequests
);

withdrawalRequestRouter.patch(
    "/:id/approve",
    validate(adminWithdrawalValidation.withdrawalRequestIdParamSchema, "params"),
    adminWithdrawalController.approveWithdrawalRequest
);

withdrawalRequestRouter.patch(
    "/:id/reject",
    validate(adminWithdrawalValidation.withdrawalRequestIdParamSchema, "params"),
    validate(adminWithdrawalValidation.rejectWithdrawalRequestBodySchema, "body"),
    adminWithdrawalController.rejectWithdrawalRequest
);

withdrawalRequestRouter.get(
    "/:id",
    validate(adminWithdrawalValidation.withdrawalRequestIdParamSchema, "params"),
    adminWithdrawalController.getWithdrawalRequestDetail
);

export { withdrawalRequestRouter };
export default router;
