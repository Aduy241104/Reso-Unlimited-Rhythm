import "dotenv/config";
import mongoose from "mongoose";
import connectMongoose from "../src/config/db.js";
import Track from "../src/models/Track.js";
import AudioFingerprint from "../src/models/AudioFingerprint.js";
import { processTrackAudioFingerprint } from "../src/services/fingerprint/audioFingerprint.job.js";

const apply = process.argv.includes("--apply");
const retryFailed = process.argv.includes("--retry-failed");
const batchArg = process.argv.find((arg) => arg.startsWith("--batch-size="));
const batchSize = Math.min(100, Math.max(1, Number.parseInt(batchArg?.split("=")[1], 10) || 20));

const run = async () => {
    await connectMongoose();
    const statusFilter = retryFailed
        ? { status: { $in: ["failed", "unavailable"] } }
        : { status: { $nin: ["completed", "processing"] } };
    const tracks = await Track.find({ "audioFiles.0": { $exists: true } }).select("_id title audioFiles").sort({ _id: 1 }).limit(batchSize).lean();
    const candidates = [];

    for (const track of tracks) {
        const existing = await AudioFingerprint.findOne({ trackId: track._id, algorithm: "chromaprint", algorithmVersion: "chromaprint-v1" }).select("status retryCount").lean();
        if (!existing || (statusFilter.status.$nin && statusFilter.status.$nin.includes(existing.status)) || (statusFilter.status.$in && statusFilter.status.$in.includes(existing.status))) {
            candidates.push({ id: track._id, title: track.title, status: existing?.status || "missing" });
        }
    }

    console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", batchSize, retryFailed, candidates }, null, 2));
    if (apply) {
        for (const candidate of candidates) {
            const result = await processTrackAudioFingerprint(candidate.id, { force: retryFailed });
            console.log(JSON.stringify({ trackId: candidate.id, result }));
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
