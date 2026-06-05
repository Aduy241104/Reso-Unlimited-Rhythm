import cron from "node-cron";
import {
    getAnalyticsTimezone,
    syncTrackStatsForDay,
} from "../services/analytics/trackStatAggregation.service.js";

const DAILY_TRACK_STAT_CRON_EXPRESSION = "0 0 * * *";

let isJobRunning = false;

export const runDailyTrackStatAggregation = async () => {
    if (isJobRunning) {
        console.warn("[Cron] Daily track stat aggregation is already running, skipping this tick.");
        return null;
    }

    isJobRunning = true;

    try {
        const result = await syncTrackStatsForDay("__yesterday__");
        console.log("[Cron] Daily track stat aggregation completed:", result);
        return result;
    } catch (error) {
        console.error("[Cron] Daily track stat aggregation failed:", error);
        throw error;
    } finally {
        isJobRunning = false;
    }
};

export const startDailyTrackStatCron = () => {
    const analyticsTimezone = getAnalyticsTimezone();

    const task = cron.schedule(
        DAILY_TRACK_STAT_CRON_EXPRESSION,
        () => {
            void runDailyTrackStatAggregation();
        },
        {
            timezone: analyticsTimezone,
        }
    );

    console.log(
        `[Cron] Daily track stat aggregation scheduled at 00:00 every day (${analyticsTimezone}).`
    );

    return task;
};

export default {
    runDailyTrackStatAggregation,
    startDailyTrackStatCron,
};
