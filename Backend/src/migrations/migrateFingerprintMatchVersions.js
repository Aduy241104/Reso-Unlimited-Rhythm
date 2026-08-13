import "dotenv/config";
import mongoose from "mongoose";
import connectMongoose from "../config/db.js";
import AudioFingerprintMatch from "../models/AudioFingerprintMatch.js";

const LEGACY_KEYS = ["sourceTrackId", "matchedTrackId", "algorithmVersion"];
const VERSIONED_INDEX_NAME = "unique_track_audio_version_match";

const isLegacyPairIndex = (index) => {
    const keys = Object.keys(index?.key || {});
    return keys.length === LEGACY_KEYS.length && LEGACY_KEYS.every((key, indexPosition) => keys[indexPosition] === key);
};

const run = async () => {
    await connectMongoose();
    mongoose.set("autoIndex", false);

    const [indexes, legacyMatches] = await Promise.all([
        AudioFingerprintMatch.collection.indexes(),
        AudioFingerprintMatch.find({
            $or: [
                { sourceAudioVersion: { $exists: false } },
                { matchedAudioVersion: { $exists: false } },
                { sourceAudioVersion: null },
                { matchedAudioVersion: null },
            ],
        }).select("_id sourceTrackId matchedTrackId sourceAudioVersion matchedAudioVersion matchingScope").lean(),
    ]);

    const legacyIndex = indexes.find(isLegacyPairIndex);
    console.log(JSON.stringify({
        mode: process.argv.includes("--apply") ? "apply" : "audit",
        legacyIndex: legacyIndex?.name || null,
        matchesMissingVersions: legacyMatches.length,
        note: "Legacy matches are retained; missing versions are not guessed or rewritten.",
    }, null, 2));

    if (!process.argv.includes("--apply")) return;

    await AudioFingerprintMatch.collection.createIndex(
        {
            sourceTrackId: 1,
            matchedTrackId: 1,
            algorithmVersion: 1,
            sourceAudioVersion: 1,
            matchedAudioVersion: 1,
        },
        { unique: true, name: VERSIONED_INDEX_NAME }
    );
    if (legacyIndex && legacyIndex.name !== VERSIONED_INDEX_NAME) {
        await AudioFingerprintMatch.collection.dropIndex(legacyIndex.name);
    }
};

try {
    await run();
} finally {
    await mongoose.disconnect().catch(() => null);
}
