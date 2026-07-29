import express from "express";
import authenticate from "../middlewares/Authentication/authentication.middleware.js";
import userArtistRegistrationListController from "../controllers/user.artistRegistrationList.controller.js";

const router = express.Router();

router.use(authenticate(["user", "artist"]));

router.get("/", userArtistRegistrationListController.getMyArtistRegistrationRequests);
router.get("/:id", userArtistRegistrationListController.getMyArtistRegistrationRequestDetail);
router.delete("/:id", userArtistRegistrationListController.cancelArtistRegistrationRequest);

export default router;
