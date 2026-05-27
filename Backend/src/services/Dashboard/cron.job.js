import cron from "node-cron";
import dashboardService from "./dashboard.service.js";

const CRON_SCHEDULES = {
    DAILY_STATS: "0 1 * * *",
    MONTHLY_BACKFILL: "0 3 1 * *",
};

const log = (prefix, message) => {
    console.log(`[${new Date().toISOString()}] [CRON ${prefix}] ${message}`);
};

const runDailyStats = async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    log("DAILY", `Starting daily stats computation for ${yesterday.toISOString()}`);
    try {
        const stats = await dashboardService.computeDailyStats(yesterday);
        log("DAILY", `Completed. Streams: ${stats.totalStreams}, Users: ${stats.uniqueUsers}, Time: ${stats.totalListeningTime}s`);
    } catch (err) {
        log("DAILY", `Error: ${err.message}`);
        console.error(err);
    }
};

const runMonthlyBackfill = async () => {
    const now = new Date();
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year = prevMonthDate.getFullYear();
    const month = prevMonthDate.getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();

    log("MONTHLY", `Starting monthly backfill for ${month}/${year} (${daysInMonth} days)`);
    let successCount = 0;
    let errorCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        try {
            await dashboardService.computeDailyStats(date);
            successCount++;
        } catch (err) {
            errorCount++;
            log("MONTHLY", `Day ${day} error: ${err.message}`);
        }
    }

    log("MONTHLY", `Completed backfill. Success: ${successCount}, Errors: ${errorCount}`);
};

const initCronJobs = () => {
    log("INIT", "Scheduling cron jobs...");

    cron.schedule(CRON_SCHEDULES.DAILY_STATS, runDailyStats, {
        scheduled: true,
        timezone: "Asia/Ho_Chi_Minh",
    });
    log("INIT", `Daily stats cron scheduled at ${CRON_SCHEDULES.DAILY_STATS} (Asia/Ho_Chi_Minh)`);

    cron.schedule(CRON_SCHEDULES.MONTHLY_BACKFILL, runMonthlyBackfill, {
        scheduled: true,
        timezone: "Asia/Ho_Chi_Minh",
    });
    log("INIT", `Monthly backfill cron scheduled at ${CRON_SCHEDULES.MONTHLY_BACKFILL} (Asia/Ho_Chi_Minh)`);

    log("INIT", "All cron jobs initialized successfully");
};

const triggerDailyStatsManually = async (req, res) => {
    await runDailyStats();
    return res.status(200).json({ success: true, message: "Daily stats computation triggered manually" });
};

const triggerMonthlyStatsManually = async (req, res) => {
    await runMonthlyBackfill();
    return res.status(200).json({ success: true, message: "Monthly backfill triggered manually" });
};

export {
    initCronJobs,
    runDailyStats,
    runMonthlyBackfill,
    triggerDailyStatsManually,
    triggerMonthlyStatsManually,
};
