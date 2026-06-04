import express from "express";
import libaryController from "../controllers/libary.controller.js";
import { requireUser } from "../middlewares/Authentication/authentication.middleware.js";

const router = express.Router();

router.get("/followed-artists", requireUser, libaryController.getMyFollowedArtists);

export default router;
