import cron from "node-cron";
import {
    getAnalyticsTimezone,
    syncArtistDailyOverviewStatsForDay,
} from "../services/analytics/artistDailyOverviewStatAggregation.service.js";

const DAILY_ARTIST_OVERVIEW_STAT_CRON_EXPRESSION = "3 0 * * *";

let isJobRunning = false;

export const runDailyArtistOverviewStatAggregation = async () => {
    if (isJobRunning) {
        console.warn("[Cron] Daily artist overview stat aggregation is already running, skipping this tick.");
        return null;
    }

    isJobRunning = true;

    try {
        const result = await syncArtistDailyOverviewStatsForDay("__yesterday__");
        console.log("[Cron] Daily artist overview stat aggregation completed:", result);
        return result;
    } catch (error) {
        console.error("[Cron] Daily artist overview stat aggregation failed:", error);
        throw error;
    } finally {
        isJobRunning = false;
    }
};

export const startDailyArtistOverviewStatCron = () => {
    const analyticsTimezone = getAnalyticsTimezone();

    const task = cron.schedule(
        DAILY_ARTIST_OVERVIEW_STAT_CRON_EXPRESSION,
        () => {
            void runDailyArtistOverviewStatAggregation();
        },
        {
            timezone: analyticsTimezone,
        }
    );

    console.log(
        `[Cron] Daily artist overview stat aggregation scheduled at 00:03 every day (${analyticsTimezone}).`
    );

    return task;
};

export default {
    runDailyArtistOverviewStatAggregation,
    startDailyArtistOverviewStatCron,
};
