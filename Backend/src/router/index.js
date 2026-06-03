import albumRoutes from "./album.routes.js";
import artistBrowseRoutes from "./artistBrowse.routes.js";
import artistRoutes from "./artist.routes.js";
import artistAlbumRoutes from "./artist.album.routes.js";
import genreRoutes from "./genre.routes.js";
import authenticationRoutes from "./authentication.routes.js";
import playlistRoutes from "./playlist.routes.js";
import trackRoutes from "./track.routes.js";
import artistTrackRoutes from "./artist.track.routes.js";
import lyricsRoutes from "./artist.lyrics.routes.js";
import adminRoutes from "./admin.routes.js";
import transactionRoutes from "./transaction.routes.js";

function route(app) {
    app.use("/api/auth", authenticationRoutes);
    app.use("/api/genres", genreRoutes);
    app.use("/api/albums", albumRoutes);
    app.use("/api/browse/artists", artistBrowseRoutes);
    app.use("/api/artists", artistRoutes);
    app.use("/api/artists/albums", artistAlbumRoutes);
    app.use("/api/playlists", playlistRoutes);
    app.use("/api/artist/track", artistTrackRoutes);
    app.use("/api/tracks", trackRoutes);
    app.use("/api/artist/lyrics", lyricsRoutes);
    app.use("/api/admin", adminRoutes);
    app.use("/api/transactions", transactionRoutes);
}

export default route;
