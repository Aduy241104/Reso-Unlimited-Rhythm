import express from "express";
import adminArtistRequestController from "../controllers/admin.artistRequest.controller.js";

const router = express.Router();

router.get("/", adminArtistRequestController.getArtistRequests);

export default router;
