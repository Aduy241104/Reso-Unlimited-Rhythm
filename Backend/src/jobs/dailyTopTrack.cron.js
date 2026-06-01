import cron from "node-cron";
import {
    getAnalyticsTimezone,
    syncTrackStatsForDay,
} from "../services/analytics/trackStatAggregation.service.js";

const DAILY_TOP_TRACK_CRON_EXPRESSION = "0 0 * * *";

let isJobRunning = false;

export const runDailyTopTrackAggregation = async () => {
    if (isJobRunning) {
        console.warn("[Cron] Daily top track aggregation is already running, skipping this tick.");
        return null;
    }

    isJobRunning = true;

    try {
        const result = await syncTrackStatsForDay("__yesterday__");
        console.log("[Cron] Daily top track aggregation completed:", result);
        return result;
    } catch (error) {
        console.error("[Cron] Daily top track aggregation failed:", error);
        throw error;
    } finally {
        isJobRunning = false;
    }
};

export const runTodayAggregation = async () => {
    if (isJobRunning) {
        return { message: "Aggregation already running, try again later." };
    }

    isJobRunning = true;

    try {
        const result = await syncTrackStatsForDay();
        console.log("[Today] Aggregation completed:", result);
        return result;
    } catch (error) {
        console.error("[Today] Aggregation failed:", error);
        throw error;
    } finally {
        isJobRunning = false;
    }
};

export const startDailyTopTrackCron = () => {
    const analyticsTimezone = getAnalyticsTimezone();

    const task = cron.schedule(
        DAILY_TOP_TRACK_CRON_EXPRESSION,
        () => {
            void runDailyTopTrackAggregation();
        },
        {
            timezone: analyticsTimezone,
        }
    );

    console.log(
        `[Cron] Daily top track aggregation scheduled at 00:00 every day (${analyticsTimezone}).`
    );

    return task;
};

export default {
    runDailyTopTrackAggregation,
    runTodayAggregation,
    startDailyTopTrackCron,
};
