import express from "express";
import dotenv from "dotenv";
import route from "./router/index.js";
import morgan from "morgan";
import connectMongose from "./config/db.js";
import cors from "cors";
import corsOptions from "./config/corsConfig.js";
import cookieParser from "cookie-parser";
import http from "http";
import { connectRedis } from "./config/redisConfig.js";
import { startDailyTopArtistCron } from "./jobs/dailyTopArtist.cron.js";
import { startDailyTopTrackCron } from "./jobs/dailyTopTrack.cron.js";
import { startMonthlyTrackStatCron } from "./jobs/monthlyTrackStat.cron.js";
import {
    globalErrorHandler,
    notFoundHandler,
} from "./middlewares/error.middleware.js";
import model from "./models/index.js";

dotenv.config();
const app = express();
const server = http.createServer(app);

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/static", express.static("public"));

app.use(morgan("combined"));

route(app);

app.get("/test", async (req, res) => { res.json("hello") });

app.use(notFoundHandler);
app.use(globalErrorHandler);

const PORT = process.env.PORT || 8080;

const startServer = async () => {
    try {
        await connectMongose();
        await connectRedis();
        startDailyTopArtistCron();
        startDailyTopTrackCron();
        startMonthlyTrackStatCron();

        server.listen(PORT, () => {
            console.log(`🚀 Server + Socket.IO đang chạy tại http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("ðŸš¨ Failed to start server:", error);
        process.exit(1);
    }
};

void startServer();
