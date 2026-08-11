import "dotenv/config";
import mongoose from "mongoose";
import connectMongoose from "../src/config/db.js";
import Artist from "../src/models/Artist.js";
import Track from "../src/models/Track.js";

const shouldApply = process.argv.includes("--apply");

const run = async () => {
    await connectMongoose();

    const candidates = await Track.collection.find({
        artistId: { $exists: true, $ne: null },
        artist_artistId: { $exists: false },
    }).project({ _id: 1, artistId: 1 }).toArray();

    const validCandidates = [];
    for (const candidate of candidates) {
        if (mongoose.Types.ObjectId.isValid(candidate.artistId) &&
            await Artist.exists({ _id: candidate.artistId })) {
            validCandidates.push(candidate);
        }
    }

    console.log(JSON.stringify({
        mode: shouldApply ? "apply" : "dry-run",
        found: candidates.length,
        valid: validCandidates.length,
        skipped: candidates.length - validCandidates.length,
    }, null, 2));

    if (shouldApply && validCandidates.length > 0) {
        const operations = validCandidates.map((candidate) => ({
            updateOne: {
                filter: {
                    _id: candidate._id,
                    artist_artistId: { $exists: false },
                },
                // Keep the legacy artistId field for rollback/audit; only add the canonical owner field.
                update: [{ $set: { artist_artistId: "$artistId" } }],
            },
        }));

        const result = await Track.collection.bulkWrite(operations, { ordered: false });
        console.log(JSON.stringify({ modified: result.modifiedCount }, null, 2));
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
