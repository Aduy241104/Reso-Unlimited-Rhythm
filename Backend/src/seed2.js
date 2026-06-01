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

const SEED_DEVICE = "seed2-cron-test";
const TOTAL_DAYS = 21;
const EVENTS_PER_DAY = 10;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

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

const DAILY_PATTERNS = [
    { fromDay: 0, toDay: 6, counts: [6, 3, 1], label: "Track 1 dominates" },
    { fromDay: 7, toDay: 13, counts: [2, 6, 2], label: "Track 2 dominates" },
    { fromDay: 14, toDay: 20, counts: [1, 2, 7], label: "Track 3 dominates" },
];

const connectDatabase = async () => {
    if (!process.env.DATABASE) {
        throw new Error("Missing DATABASE in .env");
    }

    await mongoose.connect(process.env.DATABASE);
};

const getPatternForDay = (dayOffset) =>
    DAILY_PATTERNS.find(
        (pattern) => dayOffset >= pattern.fromDay && dayOffset <= pattern.toDay
    ) || DAILY_PATTERNS[DAILY_PATTERNS.length - 1];

const startOfToday = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
};

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

const formatLocalDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

const buildEventPayload = ({
    track,
    userId,
    listenedAt,
    eventIndex,
    dayOffset,
}) => {
    const fullDuration = track.duration || 180;
    const isLikelySkip = (eventIndex + dayOffset) % 5 === 0;
    const duration = isLikelySkip
        ? Math.max(30, Math.floor(fullDuration * 0.35))
        : Math.max(60, Math.floor(fullDuration * 0.9));

    return {
        userId,
        trackId: track._id,
        artistId: track.artist_artistId,
        listenedAt,
        duration,
        completed: !isLikelySkip,
        skipped: isLikelySkip,
        device: SEED_DEVICE,
        country: "VN",
    };
};

const buildListenEvents = ({ tracks, userIds }) => {
    const today = startOfToday();
    const events = [];
    const dailySummary = [];

    for (let dayOffset = 0; dayOffset < TOTAL_DAYS; dayOffset += 1) {
        const currentDay = new Date(today.getTime() + dayOffset * DAY_IN_MS);
        const pattern = getPatternForDay(dayOffset);
        const counts = pattern.counts;

        if (counts.reduce((sum, value) => sum + value, 0) !== EVENTS_PER_DAY) {
            throw new Error(`Invalid pattern at day ${dayOffset}: total events must be ${EVENTS_PER_DAY}.`);
        }

        const dayCounts = {};
        let slotIndex = 0;

        counts.forEach((count, trackIndex) => {
            for (let occurrence = 0; occurrence < count; occurrence += 1) {
                const listenedAt = setTimeForDate(currentDay, DAILY_TIME_SLOTS[slotIndex]);
                const userId = userIds[(dayOffset + slotIndex) % userIds.length];
                const track = tracks[trackIndex];

                events.push(
                    buildEventPayload({
                        track,
                        userId,
                        listenedAt,
                        eventIndex: slotIndex,
                        dayOffset,
                    })
                );

                dayCounts[String(track._id)] = (dayCounts[String(track._id)] || 0) + 1;
                slotIndex += 1;
            }
        });

        dailySummary.push({
            date: formatLocalDate(currentDay),
            pattern: pattern.label,
            counts: dayCounts,
        });
    }

    return { events, dailySummary };
};

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
        users: TEST_USER_IDS.map((id) => id),
        tracks: TEST_TRACK_IDS.map((id) => trackById.get(id)),
    };
};

const clearPreviousSeedData = async () => {
    const deleted = await ListenEvent.deleteMany({ device: SEED_DEVICE });
    return deleted.deletedCount || 0;
};

const run = async () => {
    try {
        await connectDatabase();

        const { users, tracks } = await validateReferences();
        const deletedCount = await clearPreviousSeedData();
        const { events, dailySummary } = buildListenEvents({
            tracks,
            userIds: users.map((id) => new mongoose.Types.ObjectId(id)),
        });

        await ListenEvent.insertMany(events);

        console.log(`Seed2 completed. Removed ${deletedCount} old test events.`);
        console.log(`Inserted ${events.length} listen events for ${TOTAL_DAYS} days.`);
        console.log("Track order:");
        tracks.forEach((track, index) => {
            console.log(`  ${index + 1}. ${track.title} (${track._id})`);
        });
        console.log("Daily pattern summary:");
        dailySummary.forEach((item) => {
            console.log(
                `  ${item.date} | ${item.pattern} | ` +
                Object.entries(item.counts)
                    .map(([trackId, count]) => `${trackId}: ${count}`)
                    .join(", ")
            );
        });
    } catch (error) {
        console.error("Seed2 failed:", error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};

void run();