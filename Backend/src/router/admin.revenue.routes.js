import express from "express";
import adminRevenueController from "../controllers/admin.revenue.controller.js";
import adminRevenueValidation from "../middlewares/Admin/admin.revenue.validation.js";
import validate from "../middlewares/validate.middleware.js";
import { requireAdmin } from "../middlewares/Authentication/authentication.middleware.js";

const router = express.Router();

router.use(requireAdmin);

router.get("/dashboard", adminRevenueController.getRevenueDashboard);
router.post(
    "/aggregate",
    validate(adminRevenueValidation.runRevenueAggregationBodySchema, "body"),
    adminRevenueController.triggerRevenueAggregation
);
router.get(
    "/periods",
    validate(adminRevenueValidation.listRevenuePeriodsQuerySchema, "query"),
    adminRevenueController.getRevenuePeriods
);
router.get(
    "/periods/:id",
    validate(adminRevenueValidation.revenuePeriodIdParamSchema, "params"),
    adminRevenueController.getRevenuePeriodDetail
);

export default router;
