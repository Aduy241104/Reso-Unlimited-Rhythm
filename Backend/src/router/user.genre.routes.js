import express from "express";
import {
    getGenreListHandler,
    getGenreTracksByGenreIdHandler,
} from "../controllers/user.genre.controller.js";

const router = express.Router();

router.get("/", getGenreListHandler);
router.get("/:genreId/tracks", getGenreTracksByGenreIdHandler);

export default router;
