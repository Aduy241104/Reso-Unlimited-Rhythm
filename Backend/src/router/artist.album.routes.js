import express from "express";
import artistAlbumController from "../controllers/artist.album.controller.js";
import { requireArtist } from "../middlewares/Authentication/authentication.middleware.js";
import upload from "../middlewares/upload.middleware.js";

const router = express.Router();

router.use(requireArtist);

router.get("/", artistAlbumController.getMyAlbums);
router.post("/", upload.single("coverImage"), artistAlbumController.createAlbum);

router.patch("/:id/hide", artistAlbumController.hideAlbum);
router.patch("/:id/unhide", artistAlbumController.unhideAlbum);
router.post("/:id/tracks", artistAlbumController.addTrackToAlbum);
router.delete("/:id/tracks/:trackId", artistAlbumController.removeTrackFromAlbum);

router.patch("/:id", upload.single("coverImage"), artistAlbumController.updateAlbum);
router.get("/:id", artistAlbumController.getMyAlbumDetail);

export default router;
