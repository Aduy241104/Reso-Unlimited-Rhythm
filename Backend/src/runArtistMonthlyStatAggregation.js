import dotenv from "dotenv";
import mongoose from "mongoose";
import connectMongoose from "./config/db.js";
import {
    syncArtistMonthlyStatsForMonth,
} from "./services/analytics/artistMonthlyStatAggregation.service.js";

dotenv.config();

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

const readTargetMonthArgument = () => {
    const rawArgument = process.argv[2];

    if (!rawArgument) {
        return undefined;
    }

    if (!MONTH_PATTERN.test(rawArgument)) {
        throw new Error("Invalid target month. Use YYYY-MM format, for example 2026-07.");
    }

    return `${rawArgument}-01`;
};

const main = async () => {
    const targetMonthInput = readTargetMonthArgument();

    await connectMongoose();

    const result = await syncArtistMonthlyStatsForMonth(targetMonthInput);

    console.log("Artist monthly stat aggregation completed successfully.");
    console.log(`Timezone: ${result.timezone}`);
    console.log(`Target month: ${result.targetMonth}`);
    console.log(`Matched artists: ${result.monthly.matchedArtists}`);
    console.log(`Upserted records: ${result.monthly.upsertedCount}`);
    console.log(`Modified records: ${result.monthly.modifiedCount || 0}`);
    console.log(`Deleted records: ${result.monthly.deletedCount}`);
};

main()
    .catch((error) => {
        console.error("Artist monthly stat aggregation failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
