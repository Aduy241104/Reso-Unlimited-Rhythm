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
import { startMonthlyTopArtistCron } from "./jobs/monthlyTopArtist.cron.js";
import { startDailyTrackStatCron } from "./jobs/dailyTrackStat.cron.js";
import { startDailyTopTrackCron } from "./jobs/dailyTopTrack.cron.js";
import { startMonthlyTrackStatCron } from "./jobs/monthlyTrackStat.cron.js";
import { startMonthlyTopTrackCron } from "./jobs/monthlyTopTrack.cron.js";
import { runStartupAnalyticsCatchup } from "./jobs/startupAnalyticsCatchup.js";
import { startListenEventSyncCron } from "./jobs/syncListenEventsFromRedis.job.js";
import {
    globalErrorHandler,
    notFoundHandler,
} from "./middlewares/error.middleware.js";
import model from "./models/index.js";
import { startPlatformStreamingStatsCron } from "./jobs/platformStreamingStats.cron.js";
import {
    runReleaseSchedulePublication,
    startReleaseScheduleCron,
} from "./jobs/releaseSchedule.cron.js";
import {
    runSubscriptionMaintenance,
    startSubscriptionMaintenanceCron,
} from "./jobs/subscriptionMaintenance.cron.js";

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

app.use(notFoundHandler);
app.use(globalErrorHandler);

const PORT = process.env.PORT || 8080;

const startServer = async () => {
    try {


        await connectMongose();
        await connectRedis();

        server.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server + Socket.IO đang chạy tại port ${PORT}`);
            console.log(`📡 Server đang mở cổng mạng nội bộ tại mọi IP`);
        });
        await runReleaseSchedulePublication();
        await runSubscriptionMaintenance();
        await runStartupAnalyticsCatchup();
        startDailyTopArtistCron();
        startMonthlyTopArtistCron();
        startDailyTrackStatCron();
        startDailyTopTrackCron();
        startMonthlyTrackStatCron();
        startMonthlyTopTrackCron();
        startPlatformStreamingStatsCron();
        startListenEventSyncCron();
        startReleaseScheduleCron();
        startSubscriptionMaintenanceCron();


    } catch (error) {
        console.error("💥¨ Failed to start server:", error);
        process.exit(1);
    }
};

void startServer();
