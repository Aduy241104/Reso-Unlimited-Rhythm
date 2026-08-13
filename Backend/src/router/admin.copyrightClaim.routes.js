import express from "express";
import { requireAdmin } from "../middlewares/Authentication/authentication.middleware.js";
import adminCopyrightClaimController from "../controllers/admin.copyrightClaim.controller.js";

const router = express.Router();
router.use(requireAdmin);
router.get("/", adminCopyrightClaimController.listClaims);
router.post("/:id/decision", adminCopyrightClaimController.decideClaim);

export default router;
