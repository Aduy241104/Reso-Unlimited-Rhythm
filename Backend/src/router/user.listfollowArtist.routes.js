import express from "express";
import userListfollowArtistController from "../controllers/user.listfollowArtist.controller.js";
import authenticate from "../middlewares/Authentication/authentication.middleware.js";

const router = express.Router();

router.get("/", authenticate("user"), userListfollowArtistController.getUserListfollowArtists);

export default router;
