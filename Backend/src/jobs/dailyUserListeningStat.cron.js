import cron from "node-cron";
import userListeningDailyStatAggregationService from "../services/user/userListeningDailyStatAggregation.service.js";
import { getAnalyticsTimezone } from "../services/analytics/trackStatAggregation.service.js";

const DAILY_USER_LISTENING_STAT_CRON_EXPRESSION = "3 0 * * *";

let isJobRunning = false;

export const runUserListeningDailyStatAggregation = async () => {
    if (isJobRunning) {
        console.warn("[Cron] Daily user listening stat aggregation is already running, skipping this tick.");
        return null;
    }

    isJobRunning = true;

    try {
        const result =
            await userListeningDailyStatAggregationService.syncUserListeningDailyStatsForDay(
                "__yesterday__"
            );
        console.log("[Cron] Daily user listening stat aggregation completed:", result);
        return result;
    } catch (error) {
        console.error("[Cron] Daily user listening stat aggregation failed:", error);
        throw error;
    } finally {
        isJobRunning = false;
    }
};

export const startDailyUserListeningStatCron = () => {
    const analyticsTimezone = getAnalyticsTimezone();

    const task = cron.schedule(
        DAILY_USER_LISTENING_STAT_CRON_EXPRESSION,
        () => {
            void runUserListeningDailyStatAggregation();
        },
        {
            timezone: analyticsTimezone,
        }
    );

    console.log(
        `[Cron] Daily user listening stat aggregation scheduled at 00:03 every day (${analyticsTimezone}).`
    );

    return task;
};

export default {
    runUserListeningDailyStatAggregation,
    startDailyUserListeningStatCron,
};
