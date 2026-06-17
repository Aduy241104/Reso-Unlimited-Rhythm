import express from "express";
import artistWithdrawalController from "../controllers/artist.withdrawal.controller.js";
import { requireArtist } from "../middlewares/Authentication/authentication.middleware.js";

const router = express.Router();

router.get(
    "/me/revenue-summary",
    requireArtist,
    artistWithdrawalController.getMyRevenueSummary
);

export default router;
