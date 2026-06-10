import cron from "node-cron";
import { getAnalyticsTimezone } from "../services/analytics/trackStatAggregation.service.js";
import { publishDueReleaseSchedules } from "../services/artist.releaseSchedule.service.js";

const EVERY_MINUTE_CRON_EXPRESSION = "* * * * *";

let isJobRunning = false;

export const runReleaseSchedulePublication = async () => {
    if (isJobRunning) {
        console.warn("[Cron] Release schedule publication is already running, skipping this tick.");
        return {
            updatedCount: 0,
            skipped: true,
        };
    }

    isJobRunning = true;

    try {
        const result = await publishDueReleaseSchedules();

        if (result.updatedCount > 0) {
            console.log(
                `[Cron] Release schedule publication marked ${result.updatedCount} schedule(s) as released.`
            );
        }

        return result;
    } catch (error) {
        console.error("[Cron] Release schedule publication failed:", error);
        throw error;
    } finally {
        isJobRunning = false;
    }
};

export const startReleaseScheduleCron = () => {
    const timezone = getAnalyticsTimezone();

    const task = cron.schedule(
        EVERY_MINUTE_CRON_EXPRESSION,
        () => {
            void runReleaseSchedulePublication();
        },
        {
            timezone,
        }
    );

    console.log(
        `[Cron] Release schedule publication scheduled every minute (${timezone}).`
    );

    return { task };
};

export default {
    runReleaseSchedulePublication,
    startReleaseScheduleCron,
};
