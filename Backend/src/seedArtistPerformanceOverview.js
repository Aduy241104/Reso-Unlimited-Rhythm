import bcrypt from "bcrypt";
import dotenv from "dotenv";
import mongoose from "mongoose";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import models from "./models/index.js";
import { syncArtistDailyOverviewStatsForDay } from "./services/analytics/artistDailyOverviewStatAggregation.service.js";
import { getAnalyticsTimezone } from "./services/analytics/trackStatAggregation.service.js";

dotenv.config();

dayjs.extend(utc);
dayjs.extend(timezone);

const {
    Artist,
    ArtistDailyStat,
    ListenEvent,
    Track,
    User,
} = models;

const oid = (value) => new mongoose.Types.ObjectId(value);

const ids = {
    artistUser: oid("682500000000000000000101"),
    artistProfile: oid("682500000000000000000201"),
    trackLeadSingle: oid("682500000000000000000301"),
    trackNightDrive: oid("682500000000000000000302"),
    listenerTeen: oid("682500000000000000000401"),
    listenerYoungAdult: oid("682500000000000000000402"),
    listenerAdult: oid("682500000000000000000403"),
    listenerMidCareer: oid("682500000000000000000404"),
    listenerSenior: oid("682500000000000000000405"),
    listenerVeteran: oid("682500000000000000000406"),
    listenerUnknownAge: oid("682500000000000000000407"),
};

const ANALYTICS_TIMEZONE = getAnalyticsTimezone();
const DEVICE_MARKER = "seed-artist-performance-overview";
const ARTIST_EMAIL = "artist.overview.seed@example.com";
const ARTIST_PASSWORD = "ArtistOverview@123";

const LISTENER_DEFINITIONS = [
    {
        _id: ids.listenerTeen,
        email: "listener.teen.overview@example.com",
        fullName: "Teen Listener",
        gender: "female",
        dateOfBirth: "2010-05-20",
        country: "Vietnam",
        eventCountry: "Vietnam",
    },
    {
        _id: ids.listenerYoungAdult,
        email: "listener.young.overview@example.com",
        fullName: "Young Adult Listener",
        gender: "male",
        dateOfBirth: "2004-09-14",
        country: "Thailand",
        eventCountry: "Thailand",
    },
    {
        _id: ids.listenerAdult,
        email: "listener.adult.overview@example.com",
        fullName: "Adult Listener",
        gender: "female",
        dateOfBirth: "1997-03-11",
        country: "Japan",
        eventCountry: "Japan",
    },
    {
        _id: ids.listenerMidCareer,
        email: "listener.midcareer.overview@example.com",
        fullName: "Mid Career Listener",
        gender: "male",
        dateOfBirth: "1988-07-22",
        country: "United States",
        eventCountry: "United States",
    },
    {
        _id: ids.listenerSenior,
        email: "listener.senior.overview@example.com",
        fullName: "Senior Listener",
        gender: "female",
        dateOfBirth: "1976-11-05",
        country: "France",
        eventCountry: "France",
    },
    {
        _id: ids.listenerVeteran,
        email: "listener.veteran.overview@example.com",
        fullName: "Veteran Listener",
        gender: "male",
        dateOfBirth: "1964-01-27",
        country: "Canada",
        eventCountry: "Canada",
    },
    {
        _id: ids.listenerUnknownAge,
        email: "listener.unknown.overview@example.com",
        fullName: "Unknown Age Listener",
        gender: "prefer_not_to_say",
        dateOfBirth: null,
        country: "Singapore",
        eventCountry: "",
    },
];

const TRACK_DEFINITIONS = [
    {
        _id: ids.trackLeadSingle,
        title: "Overview Seed Lead Single",
        duration: 218,
        avatar: "https://images.unsplash.com/photo-1516280440614-37939bbacd81",
        coverImage: [
            "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f",
        ],
    },
    {
        _id: ids.trackNightDrive,
        title: "Overview Seed Night Drive",
        duration: 196,
        avatar: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a",
        coverImage: [
            "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
        ],
    },
];

const EVENT_BLUEPRINTS = [
    { date: "2023-09-12", streams: 5, listeners: [0, 2, 4], track: 0 },
    { date: "2024-02-20", streams: 6, listeners: [1, 2, 5], track: 1 },
    { date: "2024-06-15", streams: 7, listeners: [0, 3, 6], track: 0 },
    { date: "2025-01-10", streams: 8, listeners: [2, 3, 4, 5], track: 1 },
    { date: "2025-05-22", streams: 9, listeners: [0, 1, 2, 3], track: 0 },
    { date: "2025-11-05", streams: 10, listeners: [1, 4, 5, 6], track: 1 },
    { date: "2026-01-08", streams: 11, listeners: [0, 2, 4, 6], track: 0 },
    { date: "2026-02-14", streams: 12, listeners: [1, 2, 3, 4], track: 1 },
    { date: "2026-03-21", streams: 13, listeners: [0, 1, 3, 5], track: 0 },
    { date: "2026-04-18", streams: 14, listeners: [2, 3, 4, 6], track: 1 },
    { date: "2026-05-09", streams: 15, listeners: [0, 2, 5, 6], track: 0 },
    { date: "2026-06-01", streams: 9, listeners: [0, 1, 2, 3], track: 1 },
    { date: "2026-06-10", streams: 11, listeners: [1, 3, 4, 5], track: 0 },
    { date: "2026-06-12", streams: 12, listeners: [0, 2, 4, 6], track: 1 },
    { date: "2026-06-13", streams: 15, listeners: [0, 1, 2, 3, 4], track: 0 },
    { date: "2026-06-14", streams: 18, listeners: [1, 2, 3, 4, 5, 6], track: 1 },
    { date: "2026-06-15", streams: 16, listeners: [0, 1, 2, 3, 4, 6], track: 0 },
];

const connectDatabase = async () => {
    if (!process.env.DATABASE) {
        throw new Error("Missing DATABASE in .env");
    }

    await mongoose.connect(process.env.DATABASE);
};

const createAnalyticsDate = (dateKey, streamIndex) => {
    const base = dayjs.tz(`${dateKey} 09:00`, "YYYY-MM-DD HH:mm", ANALYTICS_TIMEZONE);
    return base.add(streamIndex * 17, "minute").toDate();
};

const buildArtistUser = async () => ({
    _id: ids.artistUser,
    email: ARTIST_EMAIL,
    password: await bcrypt.hash(ARTIST_PASSWORD, 10),
    role: "artist",
    activeStatus: "active",
    emailVerified: true,
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
    profile: {
        fullName: "Overview Seed Artist",
        gender: "male",
        dateOfBirth: new Date("1995-08-12T00:00:00.000Z"),
        country: "Vietnam",
    },
    settings: {
        language: "vi",
        notificationsEnabled: true,
        shufflePlayDefault: false,
    },
});

const buildListenerUsers = async () =>
    Promise.all(
        LISTENER_DEFINITIONS.map(async (listener, index) => ({
            _id: listener._id,
            email: listener.email,
            password: await bcrypt.hash(`ListenerOverview@${index + 1}`, 10),
            role: "user",
            activeStatus: "active",
            emailVerified: true,
            avatar: "",
            profile: {
                fullName: listener.fullName,
                gender: listener.gender,
                dateOfBirth: listener.dateOfBirth
                    ? new Date(`${listener.dateOfBirth}T00:00:00.000Z`)
                    : null,
                country: listener.country,
            },
        }))
    );

const buildArtistProfile = () => ({
    _id: ids.artistProfile,
    userId: ids.artistUser,
    name: "Overview Seed Artist",
    bio: "Artist duoc tao rieng de test performance overview.",
    avatar: "https://images.unsplash.com/photo-1516280440614-37939bbacd81",
    coverImage: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a",
    verificationStatus: "verified",
    activeStatus: "active",
    stats: {
        followers: 1240,
        totalStreams: 0,
    },
});

const buildTracks = () =>
    TRACK_DEFINITIONS.map((track) => ({
        _id: track._id,
        title: track.title,
        artist_artistId: ids.artistProfile,
        duration: track.duration,
        avatar: track.avatar,
        coverImage: track.coverImage,
        releaseDate: new Date("2026-01-01T00:00:00.000Z"),
        activeStatus: "active",
        approvalStatus: "approved",
        stats: {
            totalLike: 0,
            totalPlay: 0,
        },
    }));

const buildListenEvents = () => {
    const listenerByIndex = LISTENER_DEFINITIONS;
    const tracks = TRACK_DEFINITIONS;
    const events = [];

    EVENT_BLUEPRINTS.forEach((blueprint) => {
        for (let streamIndex = 0; streamIndex < blueprint.streams; streamIndex += 1) {
            const listener = listenerByIndex[
                blueprint.listeners[streamIndex % blueprint.listeners.length]
            ];
            const track = tracks[(blueprint.track + streamIndex) % tracks.length];
            const listenedAt = createAnalyticsDate(blueprint.date, streamIndex);
            const completed = streamIndex % 4 !== 0;
            const trackDuration = track.duration;
            const listenedDuration = completed
                ? Math.max(trackDuration - 8, Math.floor(trackDuration * 0.9))
                : Math.max(35, Math.floor(trackDuration * 0.42));
            const listenPercent = Number(
                ((listenedDuration / trackDuration) * 100).toFixed(2)
            );

            events.push({
                userId: listener._id,
                trackId: track._id,
                artistId: ids.artistProfile,
                listenedAt,
                trackDuration,
                listenedDuration,
                listenPercent,
                dailyListenOrder: streamIndex + 1,
                requiredPercent: 50,
                source: streamIndex % 2 === 0 ? "artist_profile" : "search",
                isValidStream: true,
                duration: listenedDuration,
                completed,
                skipped: !completed,
                device: DEVICE_MARKER,
                country: listener.eventCountry,
            });
        }
    });

    return events;
};

const cleanupSeedData = async () => {
    await ArtistDailyStat.deleteMany({ artistId: ids.artistProfile });
    await ListenEvent.deleteMany({
        $or: [
            { device: DEVICE_MARKER },
            { artistId: ids.artistProfile },
        ],
    });
    await Track.deleteMany({
        _id: { $in: [ids.trackLeadSingle, ids.trackNightDrive] },
    });
    await Artist.deleteMany({ _id: ids.artistProfile });
    await User.deleteMany({
        _id: {
            $in: [
                ids.artistUser,
                ...LISTENER_DEFINITIONS.map((listener) => listener._id),
            ],
        },
    });
};

const seedUsers = async () => {
    const artistUser = await buildArtistUser();
    const listenerUsers = await buildListenerUsers();

    await User.insertMany([artistUser, ...listenerUsers]);
};

const syncHistoricalSnapshots = async (events) => {
    const todayKey = dayjs().tz(ANALYTICS_TIMEZONE).format("YYYY-MM-DD");
    const historicalDateKeys = [
        ...new Set(
            events
                .map((event) => dayjs(event.listenedAt).tz(ANALYTICS_TIMEZONE).format("YYYY-MM-DD"))
                .filter((dateKey) => dateKey < todayKey)
        ),
    ].sort();

    for (const dateKey of historicalDateKeys) {
        await syncArtistDailyOverviewStatsForDay(dateKey);
    }

    return historicalDateKeys;
};

const updateTrackAndArtistTotals = async () => {
    const trackPlayCounts = await ListenEvent.aggregate([
        {
            $match: {
                artistId: ids.artistProfile,
            },
        },
        {
            $group: {
                _id: "$trackId",
                totalPlay: { $sum: 1 },
            },
        },
    ]);

    for (const item of trackPlayCounts) {
        await Track.updateOne(
            { _id: item._id },
            {
                $set: {
                    "stats.totalPlay": Number(item.totalPlay || 0),
                },
            }
        );
    }

    const totalStreams = trackPlayCounts.reduce(
        (sum, item) => sum + Number(item.totalPlay || 0),
        0
    );

    await Artist.updateOne(
        { _id: ids.artistProfile },
        {
            $set: {
                "stats.totalStreams": totalStreams,
            },
        }
    );
};

const main = async () => {
    try {
        await connectDatabase();
        await cleanupSeedData();
        await seedUsers();
        await Artist.create(buildArtistProfile());
        await Track.insertMany(buildTracks());

        const events = buildListenEvents();
        await ListenEvent.insertMany(events);
        const syncedDateKeys = await syncHistoricalSnapshots(events);
        await updateTrackAndArtistTotals();

        console.log("[Seed Artist Overview] Done.");
        console.log(`  Artist login: ${ARTIST_EMAIL} / ${ARTIST_PASSWORD}`);
        console.log(`  Artist name: Overview Seed Artist`);
        console.log(`  Tracks seeded: ${TRACK_DEFINITIONS.length}`);
        console.log(`  Listener users seeded: ${LISTENER_DEFINITIONS.length}`);
        console.log(`  Listen events seeded: ${events.length}`);
        console.log(`  Historical daily snapshots synced: ${syncedDateKeys.length}`);
        console.log(`  Analytics timezone: ${ANALYTICS_TIMEZONE}`);
    } catch (error) {
        console.error("[Seed Artist Overview] Failed:", error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect().catch(() => {});
    }
};

void main();
