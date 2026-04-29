import authenticationRoutes from "./authentication.routes.js";

function route(app) {
    app.use("/api/auth", authenticationRoutes);
}

export default route;
