import cron from "node-cron";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import platformStreamingStatsService from "../services/analytics/platformStreamingStats.service.js";
import { getAnalyticsTimezone } from "../services/analytics/trackStatAggregation.service.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const THIRTY_MIN_CRON_EXPRESSION = "*/30 * * * *"; // every 30 minutes

let isJobRunning = false;

export const runPlatformStreamingStatsAggregation = async (targetDateInput) => {
    if (isJobRunning) {
        console.warn("[Cron] Platform streaming stats aggregation is already running, skipping this tick.");
        return null;
    }

    isJobRunning = true;

    try {
        const analyticsTimezone = getAnalyticsTimezone();
        const targetDate = targetDateInput
            ? dayjs(targetDateInput).tz(analyticsTimezone)
            : dayjs().tz(analyticsTimezone);

        const year = targetDate.year();
        const month = targetDate.month() + 1;

        const result = await platformStreamingStatsService.syncPlatformMonthlyStats(year, month);
        console.log(`[Cron] Platform streaming stats aggregated for ${year}-${month}:`, result ? "success" : "no data");
        return result;
    } catch (error) {
        console.error("[Cron] Platform streaming stats aggregation failed:", error);
        throw error;
    } finally {
        isJobRunning = false;
    }
};

export const startPlatformStreamingStatsCron = () => {
    const analyticsTimezone = getAnalyticsTimezone();

    const halfHourTask = cron.schedule(
        THIRTY_MIN_CRON_EXPRESSION,
        () => {
            void runPlatformStreamingStatsAggregation();
        },
        {
            timezone: analyticsTimezone,
        }
    );

    console.log(
        `[Cron] Platform streaming stats aggregation scheduled every 30 minutes (${analyticsTimezone}).`
    );

    return { halfHourTask };
};

export default {
    runPlatformStreamingStatsAggregation,
    startPlatformStreamingStatsCron,
};
