import express from "express";
import dashboardController from "../controllers/adminDashboard.controller.js";
import { requireAdmin } from "../middlewares/Authentication/authentication.middleware.js";
import { triggerDailyStatsManually, triggerMonthlyStatsManually } from "../services/Dashboard/cron.job.js";

const router = express.Router();

router.use(requireAdmin);

router.get("/stats/overview", dashboardController.getOverviewStats);
router.get("/stats/daily", dashboardController.getDailyStats);
router.get("/stats/top-tracks", dashboardController.getTopTracks);
router.get("/stats/top-artists", dashboardController.getTopArtists);
router.get("/stats/monthly", dashboardController.getMonthlyStats);
router.get("/stats/recent-months", dashboardController.getRecentMonthsStats);

router.post("/stats/trigger-daily", triggerDailyStatsManually);
router.post("/stats/trigger-monthly", triggerMonthlyStatsManually);

export default router;
