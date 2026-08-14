import express from "express";
import adminUserController from "../controllers/admin.user.controller.js";
import adminGenreController from "../controllers/admin.genre.controller.js";
import adminDashboardController from "../controllers/admin.dashboard.controller.js";
import adminArtistRequestRouter from "./adminArtistRequest.routes.js";
import adminTrackRouter from "./admin.track.routes.js";
import adminAlbumRouter from "./admin.album.routes.js";
import adminReportRouter from "./admin.report.routes.js";
import adminSubscriptionRouter from "./admin.subscription.routes.js";
import adminWithdrawalRouter, { withdrawalRequestRouter } from "./admin.withdrawal.routes.js";
import adminRevenueRouter from "./admin.revenue.routes.js";
import { requireAdmin } from "../middlewares/Authentication/authentication.middleware.js";
import upload from "../middlewares/upload.middleware.js";
import adminUserValidation from "../middlewares/Admin/admin.user.validation.js";
import validate from "../middlewares/validate.middleware.js";
import adminTrackReviewAppealRoutes from "./admin.trackReviewAppeal.routes.js";
import adminAdvertisementRoutes from "./admin.advertisement.routes.js";

const router = express.Router();

router.use(requireAdmin);
router.use("/advertisements", adminAdvertisementRoutes);

router.get("/users", adminUserController.getUsers);
router.get("/users/:id/moderation-audit", adminUserController.getUserModerationAudit);
router.get("/users/:id", adminUserController.getUserDetail);
router.get("/genres", adminGenreController.getGenres);
router.get("/genres/:id", adminGenreController.getGenre);
router.post("/genres", adminGenreController.createGenre);
router.use("/artist-requests", adminArtistRequestRouter);
router.delete('/genres/:id', adminGenreController.deleteGenre);
router.use("/tracks", adminTrackRouter);
router.use("/track-appeals", adminTrackReviewAppealRoutes);
router.use("/albums", adminAlbumRouter);
router.post(
    "/genres/upload",
    upload.single("coverImage"),
    adminGenreController.uploadGenreImage
);
router.patch("/genres/:id", adminGenreController.updateGenre);
// User mutations use explicit validation and service-level safety checks.
router.patch(
    "/users/:id",
    validate(adminUserValidation.userIdParamSchema, "params"),
    validate(adminUserValidation.updateUserSchema, "body"),
    adminUserController.updateUser
);
router.patch(
    "/users/:id/restore",
    validate(adminUserValidation.userIdParamSchema, "params"),
    adminUserController.restoreUser
);
router.delete(
    "/users/:id",
    validate(adminUserValidation.userIdParamSchema, "params"),
    adminUserController.deleteUser
);

// Dashboard - Streaming Stats
router.get("/dashboard/overview", adminDashboardController.getOverviewStats);
router.get("/dashboard/monthly", adminDashboardController.getMonthlyOverview);
router.get("/dashboard/daily", adminDashboardController.getDailyStats);
router.get("/dashboard/new-users", adminDashboardController.getNewUsersByMonth);
router.use("/withdrawals", adminWithdrawalRouter);
router.use("/withdrawal-requests", withdrawalRequestRouter);
router.use("/revenue", adminRevenueRouter);

// Reports
router.use("/reports", adminReportRouter);

// Subscriptions
router.use("/subscriptions", adminSubscriptionRouter);

export default router;
