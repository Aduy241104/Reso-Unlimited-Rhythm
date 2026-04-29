import cors from "cors";

const allowedOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://localhost:5174",  // AdminFrontend khi chạy cùng lúc với Frontend
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5500",
    "http://localhost:3001"
];

export const corsOptions = {
    origin: (origin, callback) => {
        // Cho phép request từ Postman hoặc server-side không có origin
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true); // Cho phép origin
        } else {
            callback(new Error("Not allowed by CORS")); // Chặn origin
        }
    },

    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],

    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With"
    ],

    credentials: true,
    maxAge: 86400 // Cache preflight response 1 ngày
};

export default corsOptions;
