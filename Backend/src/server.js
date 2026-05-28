import express from "express";
import dotenv from "dotenv";
import route from "./router/index.js";
import morgan from "morgan";
import connectMongose from "./config/db.js";
import cors from "cors";
import corsOptions from "./config/corsConfig.js";
import cookieParser from "cookie-parser";
import http from "http";
import redisClient from "./config/redisConfig.js";
import {
    globalErrorHandler,
    notFoundHandler,
} from "./middlewares/error.middleware.js";
import model from "./models/index.js";
import { startDailyTopTrackCron } from "./jobs/dailyTopTrack.cron.js";
import { startPlatformStreamingStatsCron } from "./jobs/platformStreamingStats.cron.js";

dotenv.config();
const app = express();
const server = http.createServer(app);

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/static", express.static("public"));

connectMongose();
// redisClient.connect().then(() => {
//     console.log("✅ Kết nối Redis thành công");
// }).catch((err) => {
//     console.error("❌ Lỗi kết nối Redis:", err);
// });

app.use(morgan("combined"));

route(app);

app.get("/test", async (req, res) => { res.json("hello") });
app.get("/run-cron", async (req, res) => {
    try {
        const { runTodayAggregation } = await import('./jobs/dailyTopTrack.cron.js');
        const result = await runTodayAggregation();
        res.json({ success: true, result });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get("/run-platform-cron", async (req, res) => {
    try {
        const { runPlatformStreamingStatsAggregation } = await import('./jobs/platformStreamingStats.cron.js');
        const { date } = req.query;
        const result = await runPlatformStreamingStatsAggregation(date || undefined);
        res.json({ success: true, result });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.use(notFoundHandler);
app.use(globalErrorHandler);


const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`🚁 Server + Socket.IO đang chạy tại http://localhost:${PORT}`);
    startDailyTopTrackCron();
    startPlatformStreamingStatsCron();
});
