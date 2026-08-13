import "dotenv/config";
import mongoose from "mongoose";
import connectMongoose from "../config/db.js";
import { normalizeArtistName } from "../services/artist/artist.name.normalizer.js";

const ARTIST_INDEX_NAME = "unique_active_artist_name_key";
const REQUEST_INDEX_NAME = "unique_pending_artist_request_stage_name_key";

const duplicateGroups = (rows, sourceField) => {
    const grouped = new Map();

    for (const row of rows) {
        const key = normalizeArtistName(row[sourceField]);
        if (!key) continue;

        const bucket = grouped.get(key) || [];
        bucket.push({
            id: String(row._id),
            value: row[sourceField] || "",
            storedKey: row.nameKey || row.stageNameKey || null,
            isDeleted: row.isDeleted,
            status: row.status,
        });
        grouped.set(key, bucket);
    }

    return [...grouped.entries()]
        .filter(([, rowsForKey]) => rowsForKey.length > 1)
        .map(([key, rowsForKey]) => ({ key, records: rowsForKey }));
};

const buildReport = (artists, requests) => {
    const activeArtists = artists.filter((artist) => artist.isDeleted !== true);
    const pendingRequests = requests.filter((request) => request.status === "pending");

    return {
        artistCount: artists.length,
        activeArtistCount: activeArtists.length,
        pendingRequestCount: pendingRequests.length,
        missingArtistKeys: artists.filter((artist) => !artist.nameKey).length,
        mismatchedArtistKeys: artists.filter(
            (artist) =>
                Boolean(artist.nameKey) &&
                normalizeArtistName(artist.name) !== artist.nameKey
        ).length,
        missingPendingRequestKeys: pendingRequests.filter(
            (request) => !request.stageNameKey
        ).length,
        mismatchedPendingRequestKeys: pendingRequests.filter(
            (request) =>
                Boolean(request.stageNameKey) &&
                normalizeArtistName(request.stageName) !== request.stageNameKey
        ).length,
        duplicateActiveArtistGroups: duplicateGroups(activeArtists, "name"),
        duplicatePendingRequestGroups: duplicateGroups(pendingRequests, "stageName"),
    };
};

const hasBlockingDuplicates = (report) =>
    report.duplicateActiveArtistGroups.length > 0 ||
    report.duplicatePendingRequestGroups.length > 0;

const run = async () => {
    await connectMongoose();
    mongoose.set("autoIndex", false);

    const [{ default: Artist }, { default: ArtistRequest }] = await Promise.all([
        import("../models/Artist.js"),
        import("../models/ArtistRequest.js"),
    ]);

    const [artists, requests] = await Promise.all([
        Artist.find({}).select("_id name nameKey isDeleted").lean(),
        ArtistRequest.find({}).select("_id stageName stageNameKey status").lean(),
    ]);
    const report = buildReport(artists, requests);

    console.log(JSON.stringify({ mode: process.argv.includes("--apply") ? "apply" : "audit", ...report }, null, 2));

    if (!process.argv.includes("--apply")) return;

    if (hasBlockingDuplicates(report)) {
        throw new Error(
            "Blocking normalized duplicates exist. Resolve them manually; this migration never deletes or merges records."
        );
    }

    const artistOperations = artists
        .map((artist) => ({
            updateOne: {
                filter: { _id: artist._id },
                update: { $set: { nameKey: normalizeArtistName(artist.name) } },
            },
        }));
    const requestOperations = requests
        .map((request) => ({
            updateOne: {
                filter: { _id: request._id },
                update: { $set: { stageNameKey: normalizeArtistName(request.stageName) } },
            },
        }));

    if (artistOperations.length > 0) await Artist.bulkWrite(artistOperations);
    if (requestOperations.length > 0) await ArtistRequest.bulkWrite(requestOperations);

    await Artist.collection.createIndex(
        { nameKey: 1 },
        {
            unique: true,
            name: ARTIST_INDEX_NAME,
            partialFilterExpression: {
                isDeleted: { $in: [false, null] },
                nameKey: { $type: "string" },
            },
        }
    );
    await ArtistRequest.collection.createIndex(
        { stageNameKey: 1 },
        {
            unique: true,
            name: REQUEST_INDEX_NAME,
            partialFilterExpression: {
                status: "pending",
                stageNameKey: { $type: "string" },
            },
        }
    );

    console.log(JSON.stringify({ backfilledArtists: artistOperations.length, backfilledRequests: requestOperations.length, indexesCreated: [ARTIST_INDEX_NAME, REQUEST_INDEX_NAME] }, null, 2));
};

try {
    await run();
} finally {
    await mongoose.disconnect().catch(() => null);
}
