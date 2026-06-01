import cron from "node-cron";
import {
    getAnalyticsTimezone,
    syncArtistMonthlyRankingsForMonth,
} from "../services/analytics/artistMonthlyRankingAggregation.service.js";

const MONTHLY_TOP_ARTIST_CRON_EXPRESSION = "5 1 1 * *";

let isJobRunning = false;

export const runMonthlyTopArtistAggregation = async () => {
    if (isJobRunning) {
        console.warn("[Cron] Monthly top artist aggregation is already running, skipping this tick.");
        return null;
    }

    isJobRunning = true;

    try {
        const result = await syncArtistMonthlyRankingsForMonth();
        console.log("[Cron] Monthly top artist aggregation completed:", result);
        return result;
    } catch (error) {
        console.error("[Cron] Monthly top artist aggregation failed:", error);
        throw error;
    } finally {
        isJobRunning = false;
    }
};

export const startMonthlyTopArtistCron = () => {
    const analyticsTimezone = getAnalyticsTimezone();

    const task = cron.schedule(
        MONTHLY_TOP_ARTIST_CRON_EXPRESSION,
        () => {
            void runMonthlyTopArtistAggregation();
        },
        {
            timezone: analyticsTimezone,
        }
    );

    console.log(
        `[Cron] Monthly top artist aggregation scheduled at 01:05 on the first day of every month (${analyticsTimezone}).`
    );

    return task;
};

export default {
    runMonthlyTopArtistAggregation,
    startMonthlyTopArtistCron,
};
