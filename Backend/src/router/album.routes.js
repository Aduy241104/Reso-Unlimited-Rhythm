import express from "express";
import albumController from "../controllers/album.controller.js";
import authenticate from "../middlewares/Authentication/authentication.middleware.js";

const router = express.Router();
const followableRoles = ["user", "artist"];

router.get("/", albumController.getAlbumList);
router.get("/artist/me", authenticate("artist"), albumController.getArtistAlbums);
router.post("/:id/follow", authenticate(followableRoles), albumController.followAlbum);
router.delete("/:id/follow", authenticate(followableRoles), albumController.unfollowAlbum);
router.get(
    "/:id/follow/status",
    authenticate(followableRoles),
    albumController.getAlbumFollowStatus
);
router.patch(
    "/:id/follow/toggle",
    authenticate(followableRoles),
    albumController.toggleFollowAlbum
);
router.get("/:id", albumController.getAlbumDetail);

export default router;
