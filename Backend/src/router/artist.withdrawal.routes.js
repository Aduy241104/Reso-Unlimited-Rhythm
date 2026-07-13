import express from "express";
import artistWithdrawalController from "../controllers/artist.withdrawal.controller.js";
import { requireArtist } from "../middlewares/Authentication/authentication.middleware.js";
import artistWithdrawalValidation from "../middlewares/artist.withdrawal.validation.js";
import validate from "../middlewares/validate.middleware.js";

const router = express.Router();

router.get(
    "/me/revenue-summary",
    requireArtist,
    artistWithdrawalController.getMyRevenueSummary
);

router.post(
    "/me/payout-accounts",
    requireArtist,
    validate(artistWithdrawalValidation.createPayoutAccountSchema),
    artistWithdrawalController.createMyPayoutAccount
);

router.post(
    "/me/withdrawal-requests",
    requireArtist,
    validate(artistWithdrawalValidation.createWithdrawalRequestSchema),
    artistWithdrawalController.createMyWithdrawalRequest
);

router.get(
    "/me/withdrawal-requests",
    requireArtist,
    artistWithdrawalController.getMyWithdrawalRequests
);

export default router;
