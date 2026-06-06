import express from "express";
import userListfollowAlbumController from "../controllers/user.listfollowAlbum.controller.js";
import authenticate from "../middlewares/Authentication/authentication.middleware.js";

const router = express.Router();

router.get("/", authenticate("user"), userListfollowAlbumController.getUserListfollowAlbums);
router.delete("/:albumId/unfollow", authenticate("user"), userListfollowAlbumController.unfollowAlbum);

export default router;
