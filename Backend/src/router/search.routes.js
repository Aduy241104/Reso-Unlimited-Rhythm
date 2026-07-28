import { Router } from "express";
import searchController from "../controllers/search.controller.js";

const router = Router();

router.get("/", searchController.searchAllHandler);
router.get("/songs", searchController.searchSongsHandler);
router.get("/artists", searchController.searchArtistsHandler);
router.get("/albums", searchController.searchAlbumsHandler);

export default router;
