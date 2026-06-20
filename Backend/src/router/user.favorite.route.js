import express from "express";
import userFavoriteController from "../controllers/user.favorite.controller.js";
import authenticate from "../middlewares/Authentication/authentication.middleware.js";

const router = express.Router();

router.post("/tracks/:trackId", authenticate(), userFavoriteController.addTrackToFavorite);
router.delete("/tracks/:trackId", authenticate(), userFavoriteController.removeTrackFromFavorite);
router.get("/tracks/:trackId/status", authenticate(), userFavoriteController.getTrackFavoriteStatus);

export default router;
