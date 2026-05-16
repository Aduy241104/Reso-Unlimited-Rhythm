import express from "express";
import adminTrackController from "../controllers/admin.track.controller.js";
import { requireAdmin } from "../middlewares/Authentication/authentication.middleware.js";

const router = express.Router();

router.get(
    "/admin",
    requireAdmin,
    adminTrackController.listTracksForAdmin
);

export default router;
