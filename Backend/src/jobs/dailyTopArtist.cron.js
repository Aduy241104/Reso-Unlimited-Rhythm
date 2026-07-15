import cron from "node-cron";
import {
    getAnalyticsTimezone,
    syncArtistDailyStatsForDay,
} from "../services/analytics/artistDailyStatAggregation.service.js";

const DAILY_TOP_ARTIST_CRON_EXPRESSION = "5 0 * * *";

let isJobRunning = false;

export const runDailyTopArtistAggregation = async () => {
    if (isJobRunning) {
        console.warn("[Cron] Daily top artist aggregation is already running, skipping this tick.");
        return null;
    }

    isJobRunning = true;

    try {
        const result = await syncArtistDailyStatsForDay();
        console.log("[Cron] Daily top artist aggregation completed:", result);
        return result;
    } catch (error) {
        console.error("[Cron] Daily top artist aggregation failed:", error);
        throw error;
    } finally {
        isJobRunning = false;
    }
};

export const startDailyTopArtistCron = () => {
    const analyticsTimezone = getAnalyticsTimezone();

    const task = cron.schedule(
        DAILY_TOP_ARTIST_CRON_EXPRESSION,
        () => {
            void runDailyTopArtistAggregation();
        },
        {
            timezone: analyticsTimezone,
        }
    );

    console.log(
        `[Cron] Daily top artist aggregation scheduled at 00:05 every day (${analyticsTimezone}).`
    );

    return task;
};

export default {
    runDailyTopArtistAggregation,
    startDailyTopArtistCron,
};
