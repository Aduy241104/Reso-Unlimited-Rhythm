import express from "express";
import artistRevenueController from "../controllers/artist.revenue.controller.js";
import { requireArtist } from "../middlewares/Authentication/authentication.middleware.js";

const router = express.Router();

router.use(requireArtist);

router.get("/latest", artistRevenueController.getLatestArtistRevenueDashboard);

export default router;
