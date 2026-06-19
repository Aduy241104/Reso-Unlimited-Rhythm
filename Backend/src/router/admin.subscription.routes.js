import express from "express";
import adminSubscriptionController from "../controllers/admin.subscription.controller.js";
import { requireAdmin } from "../middlewares/Authentication/authentication.middleware.js";

const router = express.Router();

router.use(requireAdmin);

router.get("/", adminSubscriptionController.getPlans);
router.get("/stats", adminSubscriptionController.getSubscriptionStats);
router.get("/:id", adminSubscriptionController.getPlanDetail);
router.post("/", adminSubscriptionController.createPlan);
router.patch("/:id", adminSubscriptionController.updatePlan);
router.delete("/:id", adminSubscriptionController.deletePlan);

export default router;
