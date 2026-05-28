import bcrypt from "bcrypt";
import dotenv from "dotenv";
import mongoose from "mongoose";
import models from "./models/index.js";

dotenv.config();

const {
    Artist,
    ListenEvent,
    Track,
    User,
} = models;

const oid = (value) => new mongoose.Types.ObjectId(value);

const ids = {
    listeners: [
        oid("681400000000000000000101"),
        oid("681400000000000000000102"),
        oid("681400000000000000000103"),
        oid("681400000000000000000104"),
        oid("681400000000000000000105"),
    ],
    artistUsers: [
        oid("681400000000000000000201"),
        oid("681400000000000000000202"),
        oid("681400000000000000000203"),
        oid("681400000000000000000204"),
        oid("681400000000000000000205"),
        oid("681400000000000000000206"),
        oid("681400000000000000000207"),
        oid("681400000000000000000208"),
        oid("681400000000000000000209"),
    ],
    artists: [
        oid("681400000000000000000301"),
        oid("681400000000000000000302"),
        oid("681400000000000000000303"),
        oid("681400000000000000000304"),
        oid("681400000000000000000305"),
        oid("681400000000000000000306"),
        oid("681400000000000000000307"),
        oid("681400000000000000000308"),
        oid("681400000000000000000309"),
    ],
    tracks: [
        oid("681400000000000000000401"),
        oid("681400000000000000000402"),
        oid("681400000000000000000403"),
        oid("681400000000000000000404"),
        oid("681400000000000000000405"),
        oid("681400000000000000000406"),
        oid("681400000000000000000407"),
        oid("681400000000000000000408"),
        oid("681400000000000000000409"),
    ],
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const SEED_DEVICE = "seed4-artist-top-test";
const TARGET_DATE = new Date(2026, 4, 27, 0, 0, 0, 0);

const ARTIST_PROFILES = [
    { name: "Amber Skyline", plays: 24, followers: 9800, streams: 245000, duration: 226 },
    { name: "Blue Circuit", plays: 21, followers: 9100, streams: 221000, duration: 232 },
    { name: "Crimson Echo", plays: 18, followers: 8600, streams: 198000, duration: 215 },
    { name: "Dawn Static", plays: 15, followers: 7900, streams: 176000, duration: 248 },
    { name: "Electric Harbor", plays: 12, followers: 7200, streams: 154000, duration: 205 },
    { name: "Future Lantern", plays: 9, followers: 6500, streams: 129000, duration: 240 },
    { name: "Golden Transit", plays: 6, followers: 5900, streams: 112000, duration: 221 },
    { name: "Halo Motion", plays: 4, followers: 5400, streams: 98000, duration: 214 },
    { name: "Ivory Pulse", plays: 2, followers: 5000, streams: 86000, duration: 238 },
];

const DAILY_TIME_SLOTS = [
    { hour: 0, minute: 5 },
    { hour: 1, minute: 12 },
    { hour: 2, minute: 25 },
    { hour: 3, minute: 36 },
    { hour: 4, minute: 48 },
    { hour: 6, minute: 10 },
    { hour: 7, minute: 22 },
    { hour: 8, minute: 34 },
    { hour: 9, minute: 46 },
    { hour: 10, minute: 58 },
    { hour: 12, minute: 10 },
    { hour: 13, minute: 22 },
    { hour: 14, minute: 34 },
    { hour: 15, minute: 46 },
    { hour: 16, minute: 58 },
    { hour: 18, minute: 10 },
    { hour: 19, minute: 22 },
    { hour: 20, minute: 34 },
    { hour: 21, minute: 46 },
    { hour: 22, minute: 58 },
    { hour: 23, minute: 5 },
    { hour: 23, minute: 12 },
    { hour: 23, minute: 24 },
    { hour: 23, minute: 36 },
];

const connectDatabase = async () => {
    if (!process.env.DATABASE) {
        throw new Error("Missing DATABASE in .env");
    }

    await mongoose.connect(process.env.DATABASE);
};

const buildPasswords = async () => ({
    listener: await bcrypt.hash("Seed4Listener@123", 10),
    artist: await bcrypt.hash("Seed4Artist@123", 10),
});

const nextDay = (date) => new Date(date.getTime() + DAY_IN_MS);

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

const cleanupSeedData = async () => {
    const artistIds = ids.artists;
    const userIds = [...ids.listeners, ...ids.artistUsers];
    const trackIds = ids.tracks;

    await ListenEvent.deleteMany({
        $or: [
            { device: SEED_DEVICE },
            { artistId: { $in: artistIds } },
            { trackId: { $in: trackIds } },
            { userId: { $in: userIds } },
        ],
    });

    await Track.deleteMany({ _id: { $in: trackIds } });
    await Artist.deleteMany({ _id: { $in: artistIds } });
    await User.deleteMany({ _id: { $in: userIds } });
};

const seedUsers = async (passwords) => {
    const listenerDocs = ids.listeners.map((id, index) => ({
        _id: id,
        email: `seed4.listener${index + 1}@reso.local`,
        password: passwords.listener,
        role: "user",
        activeStatus: "active",
        emailVerified: true,
        profile: {
            fullName: `Seed4 Listener ${index + 1}`,
            gender: index % 2 === 0 ? "female" : "male",
            country: "Vietnam",
        },
        stats: {
            totalListeningTime: 0,
            totalTracksPlayed: 0,
        },
    }));

    const artistUserDocs = ids.artistUsers.map((id, index) => ({
        _id: id,
        email: `seed4.artist${index + 1}@reso.local`,
        password: passwords.artist,
        role: "artist",
        activeStatus: "active",
        emailVerified: true,
        profile: {
            fullName: ARTIST_PROFILES[index].name,
            gender: "prefer_not_to_say",
            country: "Vietnam",
        },
        stats: {
            totalListeningTime: 0,
            totalTracksPlayed: 0,
        },
    }));

    await User.insertMany([...listenerDocs, ...artistUserDocs]);
};

const seedArtists = async () => {
    const artistDocs = ARTIST_PROFILES.map((profile, index) => ({
        _id: ids.artists[index],
        userId: ids.artistUsers[index],
        name: profile.name,
        bio: `${profile.name} seed artist for daily top artist testing.`,
        avatar: `https://example.com/seed4/artists/${index + 1}.jpg`,
        coverImage: `https://example.com/seed4/artists/${index + 1}-cover.jpg`,
        socialLinks: {
            facebook: `https://facebook.com/seed4-artist-${index + 1}`,
            instagram: `https://instagram.com/seed4_artist_${index + 1}`,
            youtube: `https://youtube.com/@seed4artist${index + 1}`,
        },
        verificationStatus: "verified",
        stats: {
            followers: profile.followers,
            totalStreams: profile.streams,
        },
        activeStatus: "active",
    }));

    await Artist.insertMany(artistDocs);
};

const seedTracks = async () => {
    const trackDocs = ARTIST_PROFILES.map((profile, index) => ({
        _id: ids.tracks[index],
        title: `${profile.name} Anthem`,
        artist_artistId: ids.artists[index],
        audioFiles: [
            {
                url: `https://example.com/seed4/audio/artist-${index + 1}.mp3`,
                format: "mp3",
                bitrate: 320,
                label: "original",
                priority: 0,
            },
        ],
        duration: profile.duration,
        avatar: `https://example.com/seed4/tracks/${index + 1}.jpg`,
        coverImage: [`https://example.com/seed4/tracks/${index + 1}-cover.jpg`],
        lyricsStatic: `${profile.name} sample lyrics for testing.`,
        stats: {
            totalLike: 100 + index * 25,
            totalPlay: profile.streams,
        },
        releaseDate: new Date(TARGET_DATE.getTime() - (index + 7) * DAY_IN_MS),
        activeStatus: "active",
        approvalStatus: "approved",
    }));

    await Track.insertMany(trackDocs);
};

const buildListenEvents = () => {
    const events = [];

    ARTIST_PROFILES.forEach((profile, artistIndex) => {
        const trackId = ids.tracks[artistIndex];
        const artistId = ids.artists[artistIndex];
        const duration = profile.duration;

        for (let playIndex = 0; playIndex < profile.plays; playIndex += 1) {
            const slot = DAILY_TIME_SLOTS[playIndex % DAILY_TIME_SLOTS.length];
            const userId = ids.listeners[(artistIndex + playIndex) % ids.listeners.length];
            const listenedAt = new Date(setTimeForDate(TARGET_DATE, slot).getTime() + artistIndex * 60000);
            const skipped = (playIndex + artistIndex) % 5 === 0;

            events.push({
                userId,
                trackId,
                artistId,
                listenedAt,
                duration: skipped
                    ? Math.max(30, Math.floor(duration * 0.35))
                    : Math.max(60, Math.floor(duration * 0.92)),
                completed: !skipped,
                skipped,
                device: SEED_DEVICE,
                country: "VN",
            });
        }
    });

    return events;
};

const run = async () => {
    try {
        await connectDatabase();

        const passwords = await buildPasswords();
        await cleanupSeedData();
        await seedUsers(passwords);
        await seedArtists();
        await seedTracks();

        const listenEvents = buildListenEvents();
        await ListenEvent.insertMany(listenEvents);

        console.log("Seed4 completed successfully.");
        console.log(`Target date: ${TARGET_DATE.toISOString().slice(0, 10)}`);
        console.log(`Inserted ${ARTIST_PROFILES.length} artists and ${listenEvents.length} listen events.`);
        console.log("Artist play distribution:");
        ARTIST_PROFILES.forEach((profile, index) => {
            console.log(
                `  ${index + 1}. ${profile.name} | artistId=${ids.artists[index]} | plays=${profile.plays}`
            );
        });
        console.log("Accounts:");
        console.log("  Listener password: Seed4Listener@123");
        console.log("  Artist password: Seed4Artist@123");
    } catch (error) {
        console.error("Seed4 failed:", error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};

void run();
