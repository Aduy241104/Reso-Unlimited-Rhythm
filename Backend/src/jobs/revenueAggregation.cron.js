import cron from "node-cron";
import revenueAggregationService from "../services/revenue/revenueAggregation.service.js";
import { getRevenueDashboardTimezone } from "../helpers/revenuePeriod.helper.js";

const REVENUE_AGGREGATION_CRON_EXPRESSION =
    process.env.REVENUE_AGGREGATION_CRON || "*/30 * * * *";

let isRevenueAggregationRunning = false;

export const runRevenueAggregation = async (targetDateInput) => {
    if (isRevenueAggregationRunning) {
        console.warn("[Cron] Revenue aggregation is already running, skipping this tick.");
        return null;
    }

    isRevenueAggregationRunning = true;

    try {
        const result = await revenueAggregationService.syncRevenueForMonth(
            targetDateInput
        );
        console.log(
            `[Cron] Revenue aggregation completed for ${result.targetMonth}: ` +
            `${result.summary.successfulTransactions} successful transaction(s), ` +
            `${result.summary.totalEligibleStreams} eligible stream(s).`
        );
        return result;
    } catch (error) {
        console.error("[Cron] Revenue aggregation failed:", error);
        throw error;
    } finally {
        isRevenueAggregationRunning = false;
    }
};

export const startRevenueAggregationCron = () => {
    const timezoneName = getRevenueDashboardTimezone();

    const task = cron.schedule(
        REVENUE_AGGREGATION_CRON_EXPRESSION,
        () => {
            void runRevenueAggregation();
        },
        {
            timezone: timezoneName,
        }
    );

    console.log(
        `[Cron] Revenue aggregation scheduled with '${REVENUE_AGGREGATION_CRON_EXPRESSION}' (${timezoneName}).`
    );

    return { task };
};

export default {
    runRevenueAggregation,
    startRevenueAggregationCron,
};
