import albumRoutes from "./album.routes.js";
import artistRoutes from "./artist.routes.js";
import authenticationRoutes from "./authentication.routes.js";
import playlistRoutes from "./playlist.routes.js";
import trackRoutes from "./track.routes.js";
import userRoutes from "./user.routes.js";

function route(app) {
    app.use("/api/auth", authenticationRoutes);
    app.use("/api/albums", albumRoutes);
    app.use("/api/artists", artistRoutes);
    app.use("/api/playlists", playlistRoutes);
    app.use("/api/tracks", trackRoutes);
    app.use("/api/users", userRoutes);
}

export default route;
