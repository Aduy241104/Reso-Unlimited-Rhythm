import cron from "node-cron";
import {
    getAnalyticsTimezone,
    syncTrackStatsForMonth,
} from "../services/analytics/trackStatAggregation.service.js";

const MONTHLY_TRACK_STAT_CRON_EXPRESSION = "0 0 1 * *";

let isJobRunning = false;

export const runMonthlyTrackStatAggregation = async (targetMonthInput) => {
    if (isJobRunning) {
        console.warn("[Cron] Monthly track stat aggregation is already running, skipping this tick.");
        return null;
    }

    isJobRunning = true;

    try {
        const result = await syncTrackStatsForMonth(targetMonthInput);
        console.log("[Cron] Monthly track stat aggregation completed:", result);
        return result;
    } catch (error) {
        console.error("[Cron] Monthly track stat aggregation failed:", error);
        throw error;
    } finally {
        isJobRunning = false;
    }
};

export const startMonthlyTrackStatCron = () => {
    const analyticsTimezone = getAnalyticsTimezone();

    const task = cron.schedule(
        MONTHLY_TRACK_STAT_CRON_EXPRESSION,
        () => {
            void runMonthlyTrackStatAggregation();
        },
        {
            timezone: analyticsTimezone,
        }
    );

    console.log(
        `[Cron] Monthly track stat aggregation scheduled at 00:00 on day 1 of every month (${analyticsTimezone}).`
    );

    return task;
};

export default {
    runMonthlyTrackStatAggregation,
    startMonthlyTrackStatCron,
};
