import express from "express";
import artistRevenueController from "../controllers/artist.revenue.controller.js";
import artistRevenueValidation from "../middlewares/artist.revenue.validation.js";
import { requireArtist } from "../middlewares/Authentication/authentication.middleware.js";
import validate from "../middlewares/validate.middleware.js";

const router = express.Router();

router.use(requireArtist);

router.get("/latest", artistRevenueController.getLatestArtistRevenueDashboard);
router.get(
    "/periods",
    validate(artistRevenueValidation.listArtistRevenuePeriodsQuerySchema, "query"),
    artistRevenueController.getArtistRevenuePeriods
);
router.get(
    "/periods/:id",
    validate(
        artistRevenueValidation.artistRevenuePeriodDetailParamSchema,
        "params"
    ),
    artistRevenueController.getArtistRevenuePeriodDetail
);

export default router;
