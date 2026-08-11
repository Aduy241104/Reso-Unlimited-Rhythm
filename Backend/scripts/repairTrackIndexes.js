import "dotenv/config";
import mongoose from "mongoose";
import connectMongoose from "../src/config/db.js";
import Track from "../src/models/Track.js";

const apply = process.argv.includes("--apply");
const LEGACY_INDEX = "artist_artistId_1_title_1_versionTitle_1";
const ACTIVE_INDEX = "unique_active_track_title_version";
const EXPECTED_PARTIAL_FILTER = { isDeleted: false };

const isExpectedActiveIndex = (index) => Boolean(
    index &&
    index.unique === true &&
    JSON.stringify(index.key) === JSON.stringify({ artist_artistId: 1, title: 1, versionTitle: 1 }) &&
    JSON.stringify(index.partialFilterExpression || null) === JSON.stringify(EXPECTED_PARTIAL_FILTER)
);

const run = async () => {
    await connectMongoose();
    const indexes = await Track.collection.listIndexes().toArray();
    const legacy = indexes.find((index) => index.name === LEGACY_INDEX);
    const active = indexes.find((index) => index.name === ACTIVE_INDEX);
    const duplicateActiveTitles = await Track.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        {
            $group: {
                _id: { artist_artistId: "$artist_artistId", title: "$title", versionTitle: "$versionTitle" },
                ids: { $push: "$_id" },
                count: { $sum: 1 },
            },
        },
        { $match: { count: { $gt: 1 } } },
        { $limit: 100 },
    ]);
    const missingIsDeleted = await Track.countDocuments({ isDeleted: { $exists: false } });

    console.log(JSON.stringify({
        mode: apply ? "apply" : "dry-run",
        legacyIndex: legacy ? { name: legacy.name, key: legacy.key, unique: Boolean(legacy.unique), partialFilterExpression: legacy.partialFilterExpression || null } : null,
        activeIndex: active ? { name: active.name, key: active.key, unique: Boolean(active.unique), partialFilterExpression: active.partialFilterExpression || null } : null,
        duplicateActiveTitles: duplicateActiveTitles.length,
        duplicateSamples: duplicateActiveTitles.slice(0, 10),
        missingIsDeleted,
    }, null, 2));

    if (!apply) return;
    if (duplicateActiveTitles.length > 0) {
        throw new Error("Cannot repair Track indexes while active title/version duplicates exist. Resolve the listed records first.");
    }

    // Older Track documents predate the soft-delete flag. They are active by
    // definition, so make that state explicit before the partial unique index
    // is relied on for future uploads.
    if (missingIsDeleted > 0) {
        await Track.updateMany(
            { isDeleted: { $exists: false } },
            { $set: { isDeleted: false } }
        );
    }

    if (legacy) await Track.collection.dropIndex(LEGACY_INDEX);
    if (active && !isExpectedActiveIndex(active)) {
        await Track.collection.dropIndex(ACTIVE_INDEX);
    }
    if (!active || !isExpectedActiveIndex(active)) {
        await Track.collection.createIndex(
            { artist_artistId: 1, title: 1, versionTitle: 1 },
            {
                unique: true,
                partialFilterExpression: EXPECTED_PARTIAL_FILTER,
                name: ACTIVE_INDEX,
            }
        );
    }
};

run()
    .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.connection.close().catch(() => null);
    });
