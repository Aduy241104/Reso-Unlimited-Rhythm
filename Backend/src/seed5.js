import dotenv from "dotenv";
import mongoose from "mongoose";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import models from "./models/index.js";

dotenv.config();

dayjs.extend(utc);
dayjs.extend(timezone);

const { ListenEvent, Track, User } = models;

const ANALYTICS_TIMEZONE = "Asia/Ho_Chi_Minh";
const SEED_DEVICE = "seed5-june-2026-cron-accuracy";

const USER_IDS = [
    "69f01cb9a42abee35510fe1b",
    "69f01d7cc3bea38ddbfd6eff",
    "69f16e5768c9574e0d14b8ff",
    "681300000000000000000103",
    "681300000000000000000104",
    "6a13f2a128cafd436518dce0",
    "681400000000000000000101",
    "681400000000000000000102",
    "681400000000000000000103",
    "681400000000000000000104",
    "681400000000000000000105",
];

const TRACK_IDS = [
    "681300000000000000000502",
    "6a0475491b51c3d998842756",
    "6a066ad0f04d4a1860ecbbeb",
    "6a066d23f642d903d437cd01",
    "6a0723acfaa7b5e91731d5e4",
    "681400000000000000000401",
    "681400000000000000000402",
    "681400000000000000000403",
    "681400000000000000000404",
    "681400000000000000000405",
    "681400000000000000000406",
    "681400000000000000000407",
    "681400000000000000000408",
    "681400000000000000000409",
];

const TRACK_ORDER = Object.fromEntries(TRACK_IDS.map((trackId, index) => [trackId, index + 1]));

const TIME_SLOTS = Array.from({ length: 40 }, (_, index) => {
    const totalMinutes = 15 + index * 35;
    return {
        hour: Math.floor(totalMinutes / 60),
        minute: totalMinutes % 60,
    };
});

const DURATION_PROFILES = {
    strong: {
        completed: [0.98, 0.94, 0.91, 0.96],
        skipped: [0.42, 0.36, 0.33],
    },
    steady: {
        completed: [0.89, 0.86, 0.83, 0.88],
        skipped: [0.31, 0.28, 0.35],
    },
    medium: {
        completed: [0.79, 0.75, 0.82, 0.77],
        skipped: [0.27, 0.23, 0.3],
    },
    short: {
        completed: [0.67, 0.62, 0.58, 0.64],
        skipped: [0.2, 0.18, 0.24],
    },
};

const DAY_PLANS = [
    {
        date: "2026-06-01",
        label: "Track 1 dominates, pending track appears lightly",
        entries: [
            { trackId: TRACK_IDS[0], listeners: [0, 1, 2, 3, 4, 5], skippedEvents: [5], profile: "strong" },
            { trackId: TRACK_IDS[1], listeners: [6, 7, 8, 9], skippedEvents: [1], profile: "steady" },
            { trackId: TRACK_IDS[5], listeners: [0, 0, 1], skippedEvents: [2], profile: "medium" },
            { trackId: TRACK_IDS[6], listeners: [2, 3, 2], skippedEvents: [], profile: "medium" },
            { trackId: TRACK_IDS[3], listeners: [4, 5], skippedEvents: [0], profile: "short" },
            { trackId: TRACK_IDS[7], listeners: [6, 7], skippedEvents: [], profile: "steady" },
            { trackId: TRACK_IDS[8], listeners: [8], skippedEvents: [], profile: "strong" },
            { trackId: TRACK_IDS[9], listeners: [9], skippedEvents: [0], profile: "short" },
        ],
    },
    {
        date: "2026-06-02",
        label: "Track 5 becomes daily leader, middle pack spreads wider",
        entries: [
            { trackId: TRACK_IDS[4], listeners: [0, 1, 2, 3, 4, 5, 6], skippedEvents: [0, 6], profile: "strong" },
            { trackId: TRACK_IDS[2], listeners: [7, 8, 9, 10, 7], skippedEvents: [2], profile: "steady" },
            { trackId: TRACK_IDS[1], listeners: [0, 1, 0, 1], skippedEvents: [3], profile: "medium" },
            { trackId: TRACK_IDS[10], listeners: [2, 3, 4], skippedEvents: [1], profile: "medium" },
            { trackId: TRACK_IDS[11], listeners: [5, 6, 7], skippedEvents: [], profile: "steady" },
            { trackId: TRACK_IDS[3], listeners: [8, 9, 10], skippedEvents: [2], profile: "short" },
            { trackId: TRACK_IDS[12], listeners: [0, 10], skippedEvents: [0], profile: "short" },
        ],
    },
    {
        date: "2026-06-03",
        label: "Tie on playCount between Track 6 and Track 7 with different unique listeners",
        entries: [
            { trackId: TRACK_IDS[5], listeners: [0, 1, 2, 3, 4, 5], skippedEvents: [4], profile: "strong" },
            { trackId: TRACK_IDS[6], listeners: [6, 7, 8, 6, 7, 8], skippedEvents: [1, 5], profile: "medium" },
            { trackId: TRACK_IDS[0], listeners: [9, 10, 0, 1, 2], skippedEvents: [], profile: "steady" },
            { trackId: TRACK_IDS[13], listeners: [3, 4, 5, 6], skippedEvents: [0], profile: "steady" },
            { trackId: TRACK_IDS[3], listeners: [7, 8, 9], skippedEvents: [2], profile: "short" },
            { trackId: TRACK_IDS[7], listeners: [10, 10], skippedEvents: [1], profile: "short" },
            { trackId: TRACK_IDS[8], listeners: [0], skippedEvents: [], profile: "strong" },
        ],
    },
    {
        date: "2026-06-04",
        label: "Track 9 and Track 10 tie completely to test ObjectId tie-breaker",
        entries: [
            { trackId: TRACK_IDS[8], listeners: [0, 1, 2, 3, 4], skippedEvents: [4], profile: "strong" },
            { trackId: TRACK_IDS[9], listeners: [5, 6, 7, 8, 9], skippedEvents: [0], profile: "strong" },
            { trackId: TRACK_IDS[10], listeners: [10, 0, 1, 2], skippedEvents: [], profile: "steady" },
            { trackId: TRACK_IDS[11], listeners: [3, 4, 5, 3], skippedEvents: [2], profile: "medium" },
            { trackId: TRACK_IDS[12], listeners: [6, 7, 8], skippedEvents: [1], profile: "medium" },
            { trackId: TRACK_IDS[1], listeners: [9, 10, 9], skippedEvents: [], profile: "short" },
            { trackId: TRACK_IDS[2], listeners: [0, 1], skippedEvents: [1], profile: "short" },
            { trackId: TRACK_IDS[3], listeners: [2, 3], skippedEvents: [0], profile: "short" },
            { trackId: TRACK_IDS[4], listeners: [4], skippedEvents: [], profile: "steady" },
        ],
    },
    {
        date: "2026-06-05",
        label: "Track 14 dominates, pending track surges, premium user participates often",
        entries: [
            { trackId: TRACK_IDS[13], listeners: [0, 1, 2, 3, 4, 5, 6, 7], skippedEvents: [6], profile: "strong" },
            { trackId: TRACK_IDS[3], listeners: [8, 9, 10, 0, 1, 2], skippedEvents: [1, 4], profile: "medium" },
            { trackId: TRACK_IDS[0], listeners: [3, 4, 5, 3, 4], skippedEvents: [], profile: "steady" },
            { trackId: TRACK_IDS[4], listeners: [6, 7, 8, 9], skippedEvents: [3], profile: "steady" },
            { trackId: TRACK_IDS[8], listeners: [10, 0, 10], skippedEvents: [2], profile: "short" },
            { trackId: TRACK_IDS[5], listeners: [1, 2, 3], skippedEvents: [], profile: "medium" },
            { trackId: TRACK_IDS[12], listeners: [4, 5], skippedEvents: [0], profile: "short" },
            { trackId: TRACK_IDS[6], listeners: [6], skippedEvents: [], profile: "steady" },
            { trackId: TRACK_IDS[7], listeners: [7], skippedEvents: [0], profile: "short" },
        ],
    },
];

const connectDatabase = async () => {
    if (!process.env.DATABASE) {
        throw new Error("Missing DATABASE in .env");
    }

    await mongoose.connect(process.env.DATABASE);
};

const createObjectId = (value) => new mongoose.Types.ObjectId(value);

const createVietnamDate = (dateString, slot) => {
    const hour = String(slot.hour).padStart(2, "0");
    const minute = String(slot.minute).padStart(2, "0");
    return new Date(`${dateString}T${hour}:${minute}:00+07:00`);
};

const resolveDurationRatio = (profileName, skipped, occurrenceIndex) => {
    const profile = DURATION_PROFILES[profileName] || DURATION_PROFILES.medium;
    const ratios = skipped ? profile.skipped : profile.completed;
    return ratios[occurrenceIndex % ratios.length];
};

const buildDuration = ({ fullDuration, profileName, skipped, occurrenceIndex }) => {
    const ratio = resolveDurationRatio(profileName, skipped, occurrenceIndex);
    const safeFloor = skipped ? 15 : 45;
    return Math.max(safeFloor, Math.floor(fullDuration * ratio));
};

const validateReferences = async () => {
    const [users, tracks] = await Promise.all([
        User.find({ _id: { $in: USER_IDS } }).select("_id email role").lean(),
        Track.find({ _id: { $in: TRACK_IDS } })
            .select("_id title duration artist_artistId approvalStatus activeStatus")
            .lean(),
    ]);

    if (users.length !== USER_IDS.length) {
        const foundIds = new Set(users.map((user) => String(user._id)));
        const missingIds = USER_IDS.filter((id) => !foundIds.has(id));
        throw new Error(`Missing users: ${missingIds.join(", ")}`);
    }

    if (tracks.length !== TRACK_IDS.length) {
        const foundIds = new Set(tracks.map((track) => String(track._id)));
        const missingIds = TRACK_IDS.filter((id) => !foundIds.has(id));
        throw new Error(`Missing tracks: ${missingIds.join(", ")}`);
    }

    const trackById = new Map(tracks.map((track) => [String(track._id), track]));

    for (const trackId of TRACK_IDS) {
        const track = trackById.get(trackId);
        if (!track?.artist_artistId) {
            throw new Error(`Track ${trackId} is missing artist_artistId.`);
        }
    }

    return {
        userIds: USER_IDS.map((id) => createObjectId(id)),
        trackById,
        tracks,
    };
};

const clearPreviousSeedData = async () => {
    const deleted = await ListenEvent.deleteMany({ device: SEED_DEVICE });
    return deleted.deletedCount || 0;
};

const buildListenEvents = ({ userIds, trackById }) => {
    const events = [];

    DAY_PLANS.forEach((dayPlan) => {
        let slotIndex = 0;

        dayPlan.entries.forEach((entry) => {
            const track = trackById.get(entry.trackId);

            entry.listeners.forEach((listenerIndex, occurrenceIndex) => {
                const slot = TIME_SLOTS[slotIndex];
                if (!slot) {
                    throw new Error(`Not enough time slots configured for ${dayPlan.date}.`);
                }

                const skipped = entry.skippedEvents.includes(occurrenceIndex);

                events.push({
                    userId: userIds[listenerIndex],
                    trackId: track._id,
                    artistId: track.artist_artistId,
                    listenedAt: createVietnamDate(dayPlan.date, slot),
                    duration: buildDuration({
                        fullDuration: track.duration || 180,
                        profileName: entry.profile,
                        skipped,
                        occurrenceIndex,
                    }),
                    completed: !skipped,
                    skipped,
                    device: SEED_DEVICE,
                    country: listenerIndex % 2 === 0 ? "VN" : "US",
                });

                slotIndex += 1;
            });
        });
    });

    return events;
};

const roundToTwo = (value) => Math.round(value * 100) / 100;

const summarizeDaily = ({ events, trackById }) =>
    DAY_PLANS.map((dayPlan) => {
        const statsByTrackId = new Map();

        events
            .filter((event) => dayjs(event.listenedAt).tz(ANALYTICS_TIMEZONE).format("YYYY-MM-DD") === dayPlan.date)
            .forEach((event) => {
                const trackId = String(event.trackId);
                const current = statsByTrackId.get(trackId) || {
                    trackId,
                    title: trackById.get(trackId).title,
                    approvalStatus: trackById.get(trackId).approvalStatus,
                    playCount: 0,
                    uniqueListeners: new Set(),
                    totalDuration: 0,
                    skipCount: 0,
                };

                current.playCount += 1;
                current.uniqueListeners.add(String(event.userId));
                current.totalDuration += event.duration;
                current.skipCount += event.skipped ? 1 : 0;
                statsByTrackId.set(trackId, current);
            });

        const ranking = [...statsByTrackId.values()]
            .map((item) => ({
                trackId: item.trackId,
                trackOrder: TRACK_ORDER[item.trackId],
                title: item.title,
                approvalStatus: item.approvalStatus,
                playCount: item.playCount,
                uniqueListeners: item.uniqueListeners.size,
                averageListenDuration: roundToTwo(item.totalDuration / item.playCount),
                skipCount: item.skipCount,
            }))
            .sort((left, right) => {
                if (right.playCount !== left.playCount) {
                    return right.playCount - left.playCount;
                }

                if (right.uniqueListeners !== left.uniqueListeners) {
                    return right.uniqueListeners - left.uniqueListeners;
                }

                return left.trackId.localeCompare(right.trackId);
            });

        return {
            date: dayPlan.date,
            label: dayPlan.label,
            ranking,
        };
    });

const summarizeMonthly = ({ events }) => {
    const statsByTrackId = new Map();

    events.forEach((event) => {
        const trackId = String(event.trackId);
        const current = statsByTrackId.get(trackId) || {
            trackId,
            playCount: 0,
            uniqueListeners: new Set(),
        };

        current.playCount += 1;
        current.uniqueListeners.add(String(event.userId));
        statsByTrackId.set(trackId, current);
    });

    return [...statsByTrackId.values()]
        .map((item) => ({
            trackId: item.trackId,
            trackOrder: TRACK_ORDER[item.trackId],
            playCount: item.playCount,
            uniqueListeners: item.uniqueListeners.size,
        }))
        .sort((left, right) => {
            if (right.playCount !== left.playCount) {
                return right.playCount - left.playCount;
            }

            if (right.uniqueListeners !== left.uniqueListeners) {
                return right.uniqueListeners - left.uniqueListeners;
            }

            return left.trackId.localeCompare(right.trackId);
        });
};

const logTrackCatalog = (tracks) => {
    console.log("Track catalog:");
    TRACK_IDS.forEach((trackId, index) => {
        const track = tracks.find((item) => String(item._id) === trackId);
        console.log(
            `  T${index + 1} | ${track.title} | trackId=${trackId} | approval=${track.approvalStatus} | active=${track.activeStatus}`
        );
    });
};

const logDailySummary = (dailySummary) => {
    console.log("Expected daily ranking summary:");
    dailySummary.forEach((day) => {
        console.log(`  ${day.date} | ${day.label}`);
        day.ranking.forEach((track) => {
            console.log(
                `    T${track.trackOrder} | ${track.trackId} | plays=${track.playCount} | unique=${track.uniqueListeners} | avg=${track.averageListenDuration} | skips=${track.skipCount} | approval=${track.approvalStatus}`
            );
        });
    });
};

const logMonthlySummary = (monthlySummary) => {
    console.log("Expected monthly ranking summary for 2026-06:");
    monthlySummary.forEach((track) => {
        console.log(
            `  T${track.trackOrder} | ${track.trackId} | plays=${track.playCount} | unique=${track.uniqueListeners}`
        );
    });
};

const run = async () => {
    try {
        await connectDatabase();

        const { userIds, trackById, tracks } = await validateReferences();
        const deletedCount = await clearPreviousSeedData();
        const events = buildListenEvents({ userIds, trackById });
        const dailySummary = summarizeDaily({ events, trackById });
        const monthlySummary = summarizeMonthly({ events });

        await ListenEvent.insertMany(events);

        console.log("Seed5 completed successfully.");
        console.log(`Date range: 2026-06-01 -> 2026-06-05 (${ANALYTICS_TIMEZONE})`);
        console.log(`Removed ${deletedCount} old events with device=${SEED_DEVICE}.`);
        console.log(`Inserted ${events.length} listen events.`);
        console.log(`Users used: ${USER_IDS.length}`);
        console.log(`Tracks used: ${TRACK_IDS.length}`);
        logTrackCatalog(tracks);
        logDailySummary(dailySummary);
        logMonthlySummary(monthlySummary);
        console.log("Pending track under test:");
        console.log(`  T4 | ${TRACK_IDS[3]} | present on all 5 days`);
        console.log("Premium user under test:");
        console.log(`  userId=${USER_IDS[3]} | participates across multiple days, especially 2026-06-05`);
    } catch (error) {
        console.error("Seed5 failed:", error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};

void run();
