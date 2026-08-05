import cron from "node-cron";
import {
    getAnalyticsTimezone,
} from "../services/analytics/trackStatAggregation.service.js";
import {
    syncArtistMonthlyStatsForMonth,
} from "../services/analytics/artistMonthlyStatAggregation.service.js";

const MONTHLY_ARTIST_STAT_CRON_EXPRESSION =
    process.env.MONTHLY_ARTIST_STAT_CRON || "30 0 1 * *";

let isJobRunning = false;

export const runMonthlyArtistStatAggregation = async (targetMonthInput) => {
    if (isJobRunning) {
        console.warn(
            "[Cron] Monthly artist stat aggregation is already running, skipping this tick."
        );
        return null;
    }

    isJobRunning = true;

    try {
        const result = await syncArtistMonthlyStatsForMonth(targetMonthInput);
        console.log("[Cron] Monthly artist stat aggregation completed:", result);
        return result;
    } catch (error) {
        console.error("[Cron] Monthly artist stat aggregation failed:", error);
        throw error;
    } finally {
        isJobRunning = false;
    }
};

export const startMonthlyArtistStatCron = () => {
    const analyticsTimezone = getAnalyticsTimezone();

    const task = cron.schedule(
        MONTHLY_ARTIST_STAT_CRON_EXPRESSION,
        () => {
            void runMonthlyArtistStatAggregation();
        },
        {
            timezone: analyticsTimezone,
        }
    );

    console.log(
        `[Cron] Monthly artist stat aggregation scheduled with '${MONTHLY_ARTIST_STAT_CRON_EXPRESSION}' (${analyticsTimezone}).`
    );

    return task;
};

export default {
    runMonthlyArtistStatAggregation,
    startMonthlyArtistStatCron,
};
