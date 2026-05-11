import albumRoutes from "./album.routes.js";
import authenticationRoutes from "./authentication.routes.js";

function route(app) {
    app.use("/api/auth", authenticationRoutes);
    app.use("/api/albums", albumRoutes);
}

export default route;
