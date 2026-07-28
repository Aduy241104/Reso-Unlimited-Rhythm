import dotenv from "dotenv";
import mongoose from "mongoose";
import connectMongoose from "./config/db.js";
import redisClient, { connectRedis } from "./config/redisConfig.js";
import { syncListenEventsFromRedis } from "./jobs/syncListenEventsFromRedis.job.js";

dotenv.config();

const readBatchSizeArgument = () => {
    const rawArgument = process.argv[2];

    if (!rawArgument) {
        return undefined;
    }

    const batchSize = Number(rawArgument);

    if (!Number.isInteger(batchSize) || batchSize <= 0) {
        throw new Error("Invalid batch size. Use a positive integer, for example 100.");
    }

    return batchSize;
};

const main = async () => {
    const batchSize = readBatchSizeArgument();

    await connectMongoose();
    await connectRedis();

    const result = await syncListenEventsFromRedis(batchSize);

    console.log("Listen event sync completed.");
    console.log(`Success: ${result.success}`);
    console.log(`Synced count: ${result.syncedCount}`);

    if (typeof result.updatedTrackCount === "number") {
        console.log(`Updated track count: ${result.updatedTrackCount}`);
    }

    console.log(`Message: ${result.message}`);
};

main()
    .catch((error) => {
        console.error("Listen event sync failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (redisClient?.isOpen) {
            await redisClient.quit();
        }

        await mongoose.disconnect();
    });
