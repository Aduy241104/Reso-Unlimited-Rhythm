import cron from "node-cron";
import {
    getAnalyticsTimezone,
    syncTrackStatsForDay,
} from "../services/analytics/trackStatAggregation.service.js";

const DAILY_TRACK_STAT_CRON_EXPRESSION = "*/10 * * * *";

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

export const runCurrentTrackStatAggregation = async () => {
    if (isJobRunning) {
        console.warn("[Cron] Current track stat aggregation is already running, skipping this tick.");
        return null;
    }

    isJobRunning = true;

    try {
        const result = await syncTrackStatsForDay();
        console.log("[Cron] Current track stat aggregation completed:", result);
        return result;
    } catch (error) {
        console.error("[Cron] Current track stat aggregation failed:", error);
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
            void runCurrentTrackStatAggregation();
        },
        {
            timezone: analyticsTimezone,
        }
    );

    console.log(
        `[Cron] Current track stat aggregation scheduled every 10 minutes (${analyticsTimezone}).`
    );

    return task;
};

export default {
    runCurrentTrackStatAggregation,
    runDailyTrackStatAggregation,
    startDailyTrackStatCron,
};
