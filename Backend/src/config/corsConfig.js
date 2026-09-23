import cors from "cors";

const normalizeOrigin = (origin = "") => origin.trim().replace(/\/+$/, "");

const getAllowedOrigins = () =>
    (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || "")
        .split(",")
        .map(normalizeOrigin)
        .filter(Boolean);

export const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);

        const allowedOrigins = getAllowedOrigins();
        const requestOrigin = normalizeOrigin(origin);

        if (allowedOrigins.includes(requestOrigin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },

    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],

    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With"
    ],

    credentials: true,
    maxAge: 86400
};

export default corsOptions;
