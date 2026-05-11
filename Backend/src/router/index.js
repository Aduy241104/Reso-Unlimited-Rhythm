import authenticationRoutes from "./authentication.routes.js";
import playlistRoutes from "./playlist.routes.js";

function route(app) {
    app.use("/api/auth", authenticationRoutes);
    app.use("/api/playlists", playlistRoutes);
}

export default route;
