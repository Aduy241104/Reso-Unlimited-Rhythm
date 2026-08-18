import "dotenv/config";
import mongoose from "mongoose";
import connectMongoose from "../src/config/db.js";
import Track from "../src/models/Track.js";
import { normalizeTrackTitle } from "../src/services/track/track.title.normalizer.js";

const apply = process.argv.includes("--apply");
const LEGACY_INDEX = "artist_artistId_1_title_1_versionTitle_1";
const ACTIVE_INDEX = "unique_active_track_title_version";
const TITLE_KEY_INDEX = "unique_active_track_title_key";
const EXPECTED_PARTIAL_FILTER = { isDeleted: false };
const EXPECTED_TITLE_KEY_PARTIAL_FILTER = { isDeleted: false, titleKey: { $type: "string" } };

const isExpectedActiveIndex = (index) => Boolean(
    index &&
    index.unique === true &&
    JSON.stringify(index.key) === JSON.stringify({ artist_artistId: 1, title: 1, versionTitle: 1 }) &&
    JSON.stringify(index.partialFilterExpression || null) === JSON.stringify(EXPECTED_PARTIAL_FILTER)
);

const isExpectedTitleKeyIndex = (index) => Boolean(
    index &&
    index.unique === true &&
    JSON.stringify(index.key) === JSON.stringify({ artist_artistId: 1, titleKey: 1 }) &&
    JSON.stringify(index.partialFilterExpression || null) === JSON.stringify(EXPECTED_TITLE_KEY_PARTIAL_FILTER)
);

const findDuplicateTitleKeys = (tracks) => {
    const grouped = new Map();
    tracks
        .filter((track) => track.isDeleted !== true)
        .forEach((track) => {
            const key = `${String(track.artist_artistId)}::${normalizeTrackTitle(track.title)}`;
            if (!normalizeTrackTitle(track.title)) return;
            const bucket = grouped.get(key) || [];
            bucket.push({
                id: String(track._id),
                artistId: String(track.artist_artistId),
                title: track.title || "",
                titleKey: track.titleKey || null,
                isDeleted: track.isDeleted,
            });
            grouped.set(key, bucket);
        });

    return [...grouped.entries()]
        .filter(([, rows]) => rows.length > 1)
        .map(([key, records]) => ({ key, records }));
};

const run = async () => {
    mongoose.set("autoIndex", false);
    await connectMongoose();
    const indexes = await Track.collection.listIndexes().toArray();
    const legacy = indexes.find((index) => index.name === LEGACY_INDEX);
    const active = indexes.find((index) => index.name === ACTIVE_INDEX);
    const titleKey = indexes.find((index) => index.name === TITLE_KEY_INDEX);
    const tracks = await Track.find({}).select("_id artist_artistId title titleKey isDeleted").lean();
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
    const duplicateActiveTitleKeys = findDuplicateTitleKeys(tracks);
    const missingIsDeleted = tracks.filter((track) => track.isDeleted === undefined).length;
    const missingTitleKeys = tracks.filter((track) => !track.titleKey).length;

    console.log(JSON.stringify({
        mode: apply ? "apply" : "dry-run",
        legacyIndex: legacy ? { name: legacy.name, key: legacy.key, unique: Boolean(legacy.unique), partialFilterExpression: legacy.partialFilterExpression || null } : null,
        activeIndex: active ? { name: active.name, key: active.key, unique: Boolean(active.unique), partialFilterExpression: active.partialFilterExpression || null } : null,
        titleKeyIndex: titleKey ? { name: titleKey.name, key: titleKey.key, unique: Boolean(titleKey.unique), partialFilterExpression: titleKey.partialFilterExpression || null } : null,
        duplicateActiveTitles: duplicateActiveTitles.length,
        duplicateSamples: duplicateActiveTitles.slice(0, 10),
        duplicateActiveTitleKeys: duplicateActiveTitleKeys.length,
        duplicateTitleKeySamples: duplicateActiveTitleKeys.slice(0, 10),
        missingIsDeleted,
        missingTitleKeys,
    }, null, 2));

    if (!apply) return;
    if (duplicateActiveTitles.length > 0) {
        throw new Error("Cannot repair Track indexes while active title/version duplicates exist. Resolve the listed records first.");
    }
    if (duplicateActiveTitleKeys.length > 0) {
        throw new Error("Cannot repair Track indexes while case-insensitive active title duplicates exist. Resolve the listed records first.");
    }

    // Older Track documents predate the soft-delete flag. They are active by
    // definition, so make that state explicit before the partial unique index
    // is relied on for future uploads.
    if (missingIsDeleted > 0) {
        await Track.updateMany({ isDeleted: { $exists: false } }, { $set: { isDeleted: false } });
    }

    const titleKeyOperations = tracks.map((track) => ({
        updateOne: {
            filter: { _id: track._id },
            update: { $set: { titleKey: normalizeTrackTitle(track.title) } },
        },
    }));
    if (titleKeyOperations.length > 0) await Track.bulkWrite(titleKeyOperations);

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

    if (titleKey && !isExpectedTitleKeyIndex(titleKey)) {
        await Track.collection.dropIndex(TITLE_KEY_INDEX);
    }
    if (!titleKey || !isExpectedTitleKeyIndex(titleKey)) {
        await Track.collection.createIndex(
            { artist_artistId: 1, titleKey: 1 },
            {
                unique: true,
                partialFilterExpression: EXPECTED_TITLE_KEY_PARTIAL_FILTER,
                name: TITLE_KEY_INDEX,
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
