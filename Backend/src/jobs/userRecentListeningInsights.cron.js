import cron from "node-cron";
import userListeningAnalyticsService from "../services/user/userListeningAnalytics.service.js";
import { getAnalyticsTimezone } from "../services/analytics/trackStatAggregation.service.js";

const USER_RECENT_LISTENING_INSIGHTS_CRON_EXPRESSION = "*/30 * * * *";

let isJobRunning = false;

export const runUserRecentListeningInsightsAggregation = async () => {
    if (isJobRunning) {
        console.warn("[Cron] User recent listening insights aggregation is already running, skipping this tick.");
        return null;
    }

    isJobRunning = true;

    try {
        const result =
            await userListeningAnalyticsService.refreshRecentListeningInsightsCache();
        console.log("[Cron] User recent listening insights aggregation completed:", result);
        return result;
    } catch (error) {
        console.error("[Cron] User recent listening insights aggregation failed:", error);
        throw error;
    } finally {
        isJobRunning = false;
    }
};

export const startUserRecentListeningInsightsCron = () => {
    const analyticsTimezone = getAnalyticsTimezone();

    const task = cron.schedule(
        USER_RECENT_LISTENING_INSIGHTS_CRON_EXPRESSION,
        () => {
            void runUserRecentListeningInsightsAggregation();
        },
        {
            timezone: analyticsTimezone,
        }
    );

    console.log(
        `[Cron] User recent listening insights aggregation scheduled every 30 minutes (${analyticsTimezone}).`
    );

    return task;
};

export default {
    runUserRecentListeningInsightsAggregation,
    startUserRecentListeningInsightsCron,
};
