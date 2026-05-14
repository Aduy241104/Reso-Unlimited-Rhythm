import express from "express";
import artistController from "../controllers/artist.controller.js";
import { requireArtist } from "../middlewares/Authentication/authentication.middleware.js";

const router = express.Router();

router.get("/me", requireArtist, artistController.getMyProfile);

export default router;
