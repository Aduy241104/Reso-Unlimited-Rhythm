import dotenv from "dotenv";
import mongoose from "mongoose";
import models from "./models/index.js";

dotenv.config();

const { ListenEvent, Track, User } = models;

const TEST_USER_IDS = [
    "69f16e5768c9574e0d14b8ff",
    "6a13f2a128cafd436518dce0",
    "69f0269097a8a1c6aac242a3",
];

const TEST_TRACK_IDS = [
    "681300000000000000000502",
    "6a0475491b51c3d998842756",
    "6a0723acfaa7b5e91731d5e4",
];

const SEED_DEVICE = "seed3-cron-test";
const TARGET_DATE = {
    year: 2026,
    month: 5,
    day: 26,
};

const DAILY_TIME_SLOTS = [
    { hour: 8, minute: 5 },
    { hour: 9, minute: 20 },
    { hour: 10, minute: 35 },
    { hour: 11, minute: 50 },
    { hour: 13, minute: 10 },
    { hour: 14, minute: 25 },
    { hour: 15, minute: 40 },
    { hour: 17, minute: 0 },
    { hour: 19, minute: 15 },
    { hour: 21, minute: 30 },
];

const DAILY_COUNTS = [6, 3, 1];

const connectDatabase = async () => {
    if (!process.env.DATABASE) {
        throw new Error("Missing DATABASE in .env");
    }

    await mongoose.connect(process.env.DATABASE);
};

const buildTargetDate = () =>
    new Date(
        TARGET_DATE.year,
        TARGET_DATE.month - 1,
        TARGET_DATE.day,
        0,
        0,
        0,
        0
    );

const setTimeForDate = (date, slot) =>
    new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        slot.hour,
        slot.minute,
        0,
        0
    );

const validateReferences = async () => {
    const [users, tracks] = await Promise.all([
        User.find({ _id: { $in: TEST_USER_IDS } }).select("_id email").lean(),
        Track.find({ _id: { $in: TEST_TRACK_IDS } })
            .select("_id title duration artist_artistId")
            .lean(),
    ]);

    if (users.length !== TEST_USER_IDS.length) {
        throw new Error(`Expected ${TEST_USER_IDS.length} users, found ${users.length}.`);
    }

    if (tracks.length !== TEST_TRACK_IDS.length) {
        throw new Error(`Expected ${TEST_TRACK_IDS.length} tracks, found ${tracks.length}.`);
    }

    const trackById = new Map(tracks.map((track) => [String(track._id), track]));

    return {
        users: TEST_USER_IDS.map((id) => new mongoose.Types.ObjectId(id)),
        tracks: TEST_TRACK_IDS.map((id) => trackById.get(id)),
    };
};

const buildListenEvents = ({ tracks, userIds }) => {
    const targetDate = buildTargetDate();
    const events = [];
    let slotIndex = 0;

    DAILY_COUNTS.forEach((count, trackIndex) => {
        for (let occurrence = 0; occurrence < count; occurrence += 1) {
            const listenedAt = setTimeForDate(targetDate, DAILY_TIME_SLOTS[slotIndex]);
            const track = tracks[trackIndex];
            const userId = userIds[slotIndex % userIds.length];
            const isLikelySkip = slotIndex % 5 === 0;
            const fullDuration = track.duration || 180;
            const duration = isLikelySkip
                ? Math.max(30, Math.floor(fullDuration * 0.35))
                : Math.max(60, Math.floor(fullDuration * 0.9));

            events.push({
                userId,
                trackId: track._id,
                artistId: track.artist_artistId,
                listenedAt,
                duration,
                completed: !isLikelySkip,
                skipped: isLikelySkip,
                device: SEED_DEVICE,
                country: "VN",
            });

            slotIndex += 1;
        }
    });

    return events;
};

const clearPreviousSeedData = async () => {
    const targetDate = buildTargetDate();
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const deleted = await ListenEvent.deleteMany({
        device: SEED_DEVICE,
        listenedAt: {
            $gte: targetDate,
            $lt: nextDate,
        },
    });

    return deleted.deletedCount || 0;
};

const run = async () => {
    try {
        await connectDatabase();

        const { users, tracks } = await validateReferences();
        const deletedCount = await clearPreviousSeedData();
        const events = buildListenEvents({ tracks, userIds: users });

        await ListenEvent.insertMany(events);

        console.log(`Seed3 completed. Removed ${deletedCount} old test events.`);
        console.log(`Inserted ${events.length} listen events for 2026-05-26.`);
        console.log("Track distribution:");
        tracks.forEach((track, index) => {
            console.log(`  ${track.title} (${track._id}): ${DAILY_COUNTS[index]} plays`);
        });
    } catch (error) {
        console.error("Seed3 failed:", error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};

void run();