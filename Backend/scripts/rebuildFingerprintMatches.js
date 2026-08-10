import "dotenv/config";
import mongoose from "mongoose";
import connectMongoose from "../src/config/db.js";
import AudioFingerprint from "../src/models/AudioFingerprint.js";
import { rebuildMatchesForTrack } from "../src/services/fingerprint/audioFingerprint.matching.service.js";

const apply = process.argv.includes("--apply");
const batchArg = process.argv.find((arg) => arg.startsWith("--batch-size="));
const batchSize = Math.min(1000, Math.max(1, Number.parseInt(batchArg?.split("=")[1], 10) || 100));

const run = async () => {
    await connectMongoose();
    const records = await AudioFingerprint.find({ status: "completed" }).select("trackId").sort({ trackId: 1 }).limit(batchSize).lean();
    console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", batchSize, tracks: records.length }, null, 2));
    if (apply) {
        for (const record of records) {
            console.log(JSON.stringify({ trackId: record.trackId, result: await rebuildMatchesForTrack(record.trackId) }));
        }
    }
};

run()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.connection.close().catch(() => null);
    });
