import express from "express";
import genreController from "../controllers/genre.controller.js";

const router = express.Router();

router.get("/", genreController.listGenres);

export default router;
