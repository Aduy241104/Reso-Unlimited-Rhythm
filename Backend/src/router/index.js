import albumRoutes from "./album.routes.js";
import artistRoutes from "./artist.routes.js";
import genreRoutes from "./genre.routes.js";
import authenticationRoutes from "./authentication.routes.js";
import playlistRoutes from "./playlist.routes.js";
import trackRoutes from "./track.routes.js";

function route(app) {
    app.use("/api/auth", authenticationRoutes);
    app.use("/api/genres", genreRoutes);
    app.use("/api/albums", albumRoutes);
    app.use("/api/artists", artistRoutes);
    app.use("/api/playlists", playlistRoutes);
    app.use("/api/artist/track", trackRoutes);
    app.use("/api/tracks", trackRoutes);
}

export default route;
