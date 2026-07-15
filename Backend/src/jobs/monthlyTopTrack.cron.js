import cron from "node-cron";
import {
    getAnalyticsTimezone,
    syncTrackRankingsForMonth,
} from "../services/analytics/trackStatAggregation.service.js";

const MONTHLY_TOP_TRACK_CRON_EXPRESSION = "5 0 1 * *";

let isJobRunning = false;

export const runMonthlyTopTrackAggregation = async (targetMonthInput) => {
    if (isJobRunning) {
        console.warn("[Cron] Monthly top track aggregation is already running, skipping this tick.");
        return null;
    }

    isJobRunning = true;

    try {
        const result = await syncTrackRankingsForMonth(targetMonthInput);
        console.log("[Cron] Monthly top track aggregation completed:", result);
        return result;
    } catch (error) {
        console.error("[Cron] Monthly top track aggregation failed:", error);
        throw error;
    } finally {
        isJobRunning = false;
    }
};

export const startMonthlyTopTrackCron = () => {
    const analyticsTimezone = getAnalyticsTimezone();

    const task = cron.schedule(
        MONTHLY_TOP_TRACK_CRON_EXPRESSION,
        () => {
            void runMonthlyTopTrackAggregation();
        },
        {
            timezone: analyticsTimezone,
        }
    );

    console.log(
        `[Cron] Monthly top track aggregation scheduled at 00:05 on day 1 of every month (${analyticsTimezone}).`
    );

    return task;
};

export default {
    runMonthlyTopTrackAggregation,
    startMonthlyTopTrackCron,
};
