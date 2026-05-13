import albumRoutes from "./album.routes.js";
import artistProfileRoutes from "./artistProfile.routes.js";
import authenticationRoutes from "./authentication.routes.js";
import playlistRoutes from "./playlist.routes.js";

function route(app) {
    app.use("/api/auth", authenticationRoutes);
    app.use("/api/albums", albumRoutes);
    app.use("/api/playlists", playlistRoutes);
    app.use("/api/artist/profile", artistProfileRoutes);
}

export default route;
