import express from "express";
import dotenv from "dotenv";
import route from "./router/index.js";
import morgan from "morgan";
import connectMongose from "./config/db.js";
import cors from "cors";
import corsOptions from "./config/corsConfig.js";
import cookieParser from "cookie-parser";
import http from "http";
import { initSocket } from "./config/socket.js";
import { connectRedis } from "./config/redisConfig.js";
import { startDailyTopArtistCron } from "./jobs/dailyTopArtist.cron.js";
import { startPersonalizedDailyMixCron } from "./jobs/personalizedDailyMix.cron.js";
import { startMonthlyTopArtistCron } from "./jobs/monthlyTopArtist.cron.js";
import { startMonthlyArtistStatCron } from "./jobs/monthlyArtistStat.cron.js";
import { startDailyArtistOverviewStatCron } from "./jobs/dailyArtistOverviewStat.cron.js";
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
import recommendationRoutes from "./router/recommendation.routes.js";
import {
    runReleaseSchedulePublication,
    startReleaseScheduleCron,
} from "./jobs/releaseSchedule.cron.js";
import {
    runSubscriptionMaintenance,
    startSubscriptionMaintenanceCron,
} from "./jobs/subscriptionMaintenance.cron.js";
import { startRevenueAggregationCron } from "./jobs/revenueAggregation.cron.js";
import { startAudioFingerprintCron } from "./jobs/audioFingerprint.cron.js";

dotenv.config({ quiet: true });
const app = express();
const server = http.createServer(app);

const io = initSocket(server);
app.set("io", io);

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/static", express.static("public"));

app.use(morgan("combined"));

route(app);
app.use("/api/recommendations", recommendationRoutes);

app.use(notFoundHandler);
app.use(globalErrorHandler);

const PORT = process.env.PORT || 8080;

const startServer = async () => {
    try {
        await connectMongose();
        await connectRedis();

        server.listen(PORT, "0.0.0.0", () => {
            console.log(`🚀 Server + Socket.IO đang chạy tại port ${PORT}`);
            console.log("📡 Server đang mở cổng mạng nội bộ tại mọi IP");
        });
        
        app.use("/health", (req, res) => {
            res.status(200).json({ status: "ok" });
        });
        await runReleaseSchedulePublication();
        await runSubscriptionMaintenance();

        startDailyArtistOverviewStatCron();
        startDailyTopArtistCron();
        startMonthlyTopArtistCron();
        startMonthlyArtistStatCron();
        startDailyTrackStatCron();
        startDailyTopTrackCron();
        startMonthlyTrackStatCron();
        startMonthlyTopTrackCron();
        startPlatformStreamingStatsCron();
        startPersonalizedDailyMixCron();
        startListenEventSyncCron();
        startReleaseScheduleCron();
        startSubscriptionMaintenanceCron();
        startRevenueAggregationCron();
        startAudioFingerprintCron();

        // Startup analytics repair must not prevent recurring jobs (especially
        // listen-event sync) from being registered if a catch-up operation is
        // slow or temporarily blocked by an external dependency.
        void runStartupAnalyticsCatchup().catch((error) => {
            console.error("[Startup Catch-up] Failed:", {
                name: error?.name,
                message: error?.message,
                code: error?.code,
                stack: error?.stack,
            });
        });
    } catch (error) {
        console.error("💥 Failed to start server:", error);
        process.exit(1);
    }
};

void startServer();
