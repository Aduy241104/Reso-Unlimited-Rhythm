import dotenv from "dotenv";
import mongoose from "mongoose";
import connectMongoose from "./config/db.js";
import revenueAggregationService from "./services/revenue/revenueAggregation.service.js";

dotenv.config();

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

const readTargetMonthArgument = () => {
    const rawArgument = process.argv[2];

    if (!rawArgument) {
        return undefined;
    }

    if (!MONTH_PATTERN.test(rawArgument)) {
        throw new Error("Invalid target month. Use YYYY-MM format, for example 2026-06.");
    }

    return `${rawArgument}-01`;
};

const main = async () => {
    const targetDateInput = readTargetMonthArgument();

    await connectMongoose();

    const result = await revenueAggregationService.syncRevenueForMonth(
        targetDateInput
    );

    console.log("Revenue aggregation completed successfully.");
    console.log(`Timezone: ${result.timezone}`);
    console.log(`Target month: ${result.targetMonth}`);
    console.log(`Premium revenue: ${result.summary.premiumRevenue}`);
    console.log(`Artist pool: ${result.summary.artistPool}`);
    console.log(`Platform revenue: ${result.summary.platformRevenue}`);
    console.log(
        `Successful transactions: ${result.summary.successfulTransactions}`
    );
    console.log(`Eligible streams: ${result.summary.totalEligibleStreams}`);
};

main()
    .catch((error) => {
        console.error("Revenue aggregation failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
