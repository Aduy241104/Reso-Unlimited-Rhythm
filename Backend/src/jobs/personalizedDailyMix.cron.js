import cron from "node-cron";
import dailyMixService from "../services/recommendation/dailyMix.service.js";
import { getAnalyticsTimezone } from "../services/analytics/trackStatAggregation.service.js";

const PERSONALIZED_DAILY_MIX_CRON_EXPRESSION = "0 0 * * *";

let isJobRunning = false;

export const runPersonalizedDailyMixPrebuild = async () => {
    if (isJobRunning) {
        console.warn("[Cron] Personalized daily mix prebuild is already running, skipping this tick.");
        return null;
    }

    isJobRunning = true;

    try {
        const result = await dailyMixService.prebuildDailyMixesForActiveUsers();
        console.log("[Cron] Personalized daily mix prebuild completed:", result);
        return result;
    } catch (error) {
        console.error("[Cron] Personalized daily mix prebuild failed:", error);
        throw error;
    } finally {
        isJobRunning = false;
    }
};

export const startPersonalizedDailyMixCron = () => {
    const analyticsTimezone = getAnalyticsTimezone();

    const task = cron.schedule(
        PERSONALIZED_DAILY_MIX_CRON_EXPRESSION,
        () => {
            void runPersonalizedDailyMixPrebuild();
        },
        {
            timezone: analyticsTimezone,
        }
    );

    console.log(
        `[Cron] Personalized daily mix prebuild scheduled at 00:00 every day (${analyticsTimezone}).`
    );

    return task;
};

export default {
    runPersonalizedDailyMixPrebuild,
    startPersonalizedDailyMixCron,
};
