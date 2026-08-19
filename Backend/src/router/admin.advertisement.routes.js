import express from "express";
import upload from "../middlewares/upload.middleware.js";
import adminAdvertisementController from "../controllers/admin.advertisement.controller.js";

const router = express.Router();
router.get("/", adminAdvertisementController.list);
router.post("/", adminAdvertisementController.create);
router.post("/upload", upload.single("media"), adminAdvertisementController.uploadMedia);
router.get("/:id", adminAdvertisementController.get);
router.patch("/:id", adminAdvertisementController.update);
router.delete("/:id", adminAdvertisementController.archive);
export default router;
