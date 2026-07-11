import express from "express";
import adminRevenueController from "../controllers/admin.revenue.controller.js";
import adminRevenueValidation from "../middlewares/Admin/admin.revenue.validation.js";
import validate from "../middlewares/validate.middleware.js";
import { requireAdmin } from "../middlewares/Authentication/authentication.middleware.js";

const router = express.Router();

router.use(requireAdmin);

router.get("/dashboard/charts", adminRevenueController.getRevenueCharts);
router.get("/dashboard", adminRevenueController.getCurrentRevenuePeriod);
router.get("/current", adminRevenueController.getCurrentRevenuePeriod);
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
    validate(adminRevenueValidation.revenuePeriodDetailParamSchema, "params"),
    adminRevenueController.getRevenuePeriodDetail
);
router.post(
    "/periods/:id/actions",
    validate(adminRevenueValidation.revenuePeriodIdParamSchema, "params"),
    validate(adminRevenueValidation.revenuePeriodActionBodySchema, "body"),
    adminRevenueController.processRevenuePeriodAction
);

export default router;
