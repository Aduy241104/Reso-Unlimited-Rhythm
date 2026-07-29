import "dotenv/config";
import mongoose from "mongoose";
import connectMongoose from "../config/db.js";
import ReleaseSchedule from "../models/ReleaseSchedule.js";
import Track from "../models/Track.js";

const run = async () => {
    await connectMongoose();

    const schedules = await ReleaseSchedule.find({
        type: "track",
        status: { $in: ["scheduled", "released"] },
    })
        .sort({ scheduledAt: -1, createdAt: -1, _id: -1 })
        .select("targetId scheduledAt releasedAt status")
        .lean();

    const latestScheduleByTrackId = new Map();

    for (const schedule of schedules) {
        const trackId = schedule.targetId?.toString();

        const currentSchedule = trackId
            ? latestScheduleByTrackId.get(trackId)
            : null;

        if (
            trackId &&
            (!currentSchedule ||
                (currentSchedule.status !== "released" && schedule.status === "released"))
        ) {
            latestScheduleByTrackId.set(trackId, schedule);
        }
    }

    const scheduleOperations = Array.from(latestScheduleByTrackId.values()).map(
        (schedule) => ({
            updateOne: {
                filter: { _id: schedule.targetId },
                update: {
                    $set: {
                        releaseDate: schedule.scheduledAt,
                        releaseStatus: schedule.status,
                        releasedAt:
                            schedule.status === "released"
                                ? schedule.releasedAt || schedule.scheduledAt
                                : null,
                        ...(schedule.status === "scheduled"
                            ? { activeStatus: "hidden" }
                            : {}),
                    },
                },
            },
        })
    );

    if (scheduleOperations.length > 0) {
        await Track.collection.bulkWrite(scheduleOperations, { ordered: false });
    }

    const releasedTrackIds = Array.from(latestScheduleByTrackId.values())
        .filter((schedule) => schedule.status === "released")
        .map((schedule) => schedule.targetId);

    if (releasedTrackIds.length > 0) {
        await ReleaseSchedule.updateMany(
            {
                type: "track",
                targetId: { $in: releasedTrackIds },
                status: "scheduled",
            },
            {
                $set: {
                    status: "cancelled",
                    releasedAt: null,
                },
            }
        );
    }

    const now = new Date();

    await Track.collection.updateMany(
        {
            releaseStatus: { $exists: false },
            approvalStatus: "approved",
            activeStatus: { $in: ["active", "hidden"] },
            releaseDate: { $lte: now },
        },
        [
            {
                $set: {
                    releaseStatus: "released",
                    releasedAt: { $ifNull: ["$releasedAt", "$releaseDate"] },
                },
            },
        ]
    );

    await Track.collection.updateMany(
        { releaseStatus: { $exists: false } },
        {
            $set: {
                releaseStatus: "unreleased",
                releasedAt: null,
            },
        }
    );

    console.log("Track release state backfill completed.");
};

run()
    .catch((error) => {
        console.error("Track release state backfill failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    });
