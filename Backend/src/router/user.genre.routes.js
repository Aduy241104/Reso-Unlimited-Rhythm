import express from "express";
import { getGenreListHandler } from "../controllers/user.genre.controller.js";

const router = express.Router();

router.get("/", getGenreListHandler);

export default router;
