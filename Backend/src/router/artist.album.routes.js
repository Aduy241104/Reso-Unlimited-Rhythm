import artistAlbumController from "../controllers/artist.album.controller.js";

router.get("/albums", requireArtist, artistAlbumController.getMyAlbums);
