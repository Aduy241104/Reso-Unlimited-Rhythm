import express from "express";
import adminUserController from "../controllers/admin.user.controller.js";
import adminGenreController from "../controllers/admin.genre.controller.js";
import adminDashboardController from "../controllers/admin.dashboard.controller.js";
import adminArtistRequestRouter from "./adminArtistRequest.routes.js";
import adminTrackRouter from "./admin.track.routes.js";
import adminReportRouter from "./admin.report.routes.js";
import adminWithdrawalRouter, { withdrawalRequestRouter } from "./admin.withdrawal.routes.js";
import adminRevenueRouter from "./admin.revenue.routes.js";
import { requireAdmin } from "../middlewares/Authentication/authentication.middleware.js";
import upload from "../middlewares/upload.middleware.js";

const router = express.Router();

router.use(requireAdmin);

router.get("/users", adminUserController.getUsers);
router.get("/users/:id", adminUserController.getUserDetail);
router.get("/genres", adminGenreController.getGenres);
router.get("/genres/:id", adminGenreController.getGenre);
router.post("/genres", adminGenreController.createGenre);
router.use("/artist-requests", adminArtistRequestRouter);
router.delete('/genres/:id', adminGenreController.deleteGenre);
router.use("/tracks", adminTrackRouter);
router.post(
    "/genres/upload",
    requireAdmin,
    upload.single("coverImage"),
    adminGenreController.uploadGenreImage
);
router.patch("/genres/:id", adminGenreController.updateGenre);
// The following admin user routes are intentionally disabled to keep only the "list users" and "detail" features.
// Uncomment if you need delete endpoints in the future.
router.patch("/users/:id", adminUserController.updateUser);
// router.delete("/users/:id", adminUserController.deleteUser);

// Dashboard - Streaming Stats
router.get("/dashboard/overview", adminDashboardController.getOverviewStats);
router.get("/dashboard/monthly", adminDashboardController.getMonthlyOverview);
router.get("/dashboard/daily", adminDashboardController.getDailyStats);
router.get("/dashboard/new-users", adminDashboardController.getNewUsersByMonth);
router.get("/revenue/dashboard", adminRevenueController.getRevenueDashboard);
router.use("/withdrawals", adminWithdrawalRouter);
router.use("/withdrawal-requests", withdrawalRequestRouter);
router.use("/revenue", adminRevenueRouter);

// Reports
router.use("/reports", adminReportRouter);

export default router;
