import express from "express";
import albumController from "../controllers/album.controller.js";

const router = express.Router();

router.get("/", albumController.getAlbumList);

export default router;
