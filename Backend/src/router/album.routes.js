import express from "express";
import albumController from "../controllers/album.controller.js";
import authenticate from "../middlewares/Authentication/authentication.middleware.js";

const router = express.Router();

router.get("/", albumController.getAlbumList);
router.get("/artist/me", authenticate("artist"), albumController.getArtistAlbums);
router.get("/:id", albumController.getAlbumDetail);

export default router;
