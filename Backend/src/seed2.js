import bcrypt from "bcrypt";
import dayjs from "dayjs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { fileURLToPath } from "url";
import models from "./models/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../.env");

dotenv.config({ path: envPath });

dayjs.extend(utc);
dayjs.extend(timezone);

const {
    User,
    Artist,
    ArtistVerificationRequest,
    Album,
    Track,
    UserRecentListeningActivity,
} = models;

const oid = (value) => new mongoose.Types.ObjectId(value);
const TARGET_USER_ID = "6a3b203095eb17b335c6a5d0";
const analyticsTimezone =
    process.env.ANALYTICS_TIMEZONE ||
    process.env.CRON_TIMEZONE ||
    "Asia/Ho_Chi_Minh";

const ids = {
    targetUser: oid(TARGET_USER_ID),
    artistUser: oid("683500000000000000000002"),
    artist: oid("683500000000000000000101"),
    artistVerificationRequestClosed: oid("683500000000000000000102"),
    album: oid("683500000000000000000201"),
    trackNightDrive: oid("683500000000000000000301"),
    trackMidnightSignals: oid("683500000000000000000302"),
    trackStaticDreams: oid("683500000000000000000303"),
    trackRainOnTape: oid("683500000000000000000304"),
    activityOne: oid("683500000000000000000401"),
    activityTwo: oid("683500000000000000000402"),
    activityThree: oid("683500000000000000000403"),
    activityFour: oid("683500000000000000000404"),
    activityFive: oid("683500000000000000000405"),
    activitySix: oid("683500000000000000000406"),
    activitySeven: oid("683500000000000000000407"),
    activityEight: oid("683500000000000000000408"),
    activityNine: oid("683500000000000000000409"),
    activityTen: oid("683500000000000000000410"),
};

const minutesAgo = (minutes) =>
    dayjs().tz(analyticsTimezone).subtract(minutes, "minute").toDate();
const daysAgoAt = (days, hours = 9, minutes = 0) => {
    const date = dayjs().tz(analyticsTimezone).subtract(days, "day");
    return date.hour(hours).minute(minutes).second(0).millisecond(0).toDate();
};
const seedCollections = [
    {
        model: UserRecentListeningActivity,
        ids: [
            ids.activityOne,
            ids.activityTwo,
            ids.activityThree,
            ids.activityFour,
            ids.activityFive,
            ids.activitySix,
            ids.activitySeven,
            ids.activityEight,
            ids.activityNine,
            ids.activityTen,
        ],
    },
    {
        model: Track,
        ids: [
            ids.trackNightDrive,
            ids.trackMidnightSignals,
            ids.trackStaticDreams,
            ids.trackRainOnTape,
        ],
    },
    {
        model: Album,
        ids: [ids.album],
    },
    {
        model: Artist,
        ids: [ids.artist],
    },
    {
        model: ArtistVerificationRequest,
        ids: [ids.artistVerificationRequestClosed],
    },
    {
        model: User,
        ids: [ids.artistUser],
    },
];
const indexedModels = seedCollections.map((entry) => entry.model);

const connectDatabase = async () => {
    if (!process.env.DATABASE) {
        throw new Error("Missing DATABASE in .env");
    }

    mongoose.set("autoIndex", false);
    await mongoose.connect(process.env.DATABASE);
};

const ensureIndexes = async () => {
    for (const model of indexedModels) {
        await model.init();
    }
};

const cleanupSeedData = async () => {
    for (const entry of seedCollections) {
        await entry.model.deleteMany({ _id: { $in: entry.ids } });
    }
};

const buildPasswords = async () => ({
    artist: await bcrypt.hash("Artist@123", 10),
});

const seedUsers = async (passwords) => {
    await User.create(
        {
            _id: ids.artistUser,
            email: "recent.artist.seed@reso.local",
            password: passwords.artist,
            role: "artist",
            activeStatus: "active",
            emailVerified: true,
            avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
            profile: {
                fullName: "Recent Activity Artist",
                gender: "male",
                country: "Vietnam",
            },
            settings: {
                language: "vi",
                notificationsEnabled: true,
                shufflePlayDefault: false,
            },
        }
    );
};

const seedArtistCatalog = async () => {
    await Artist.create({
        _id: ids.artist,
        userId: ids.artistUser,
        name: "Mono Noir",
        bio: "Artist seed de test recent listening activity.",
        avatar: "https://images.unsplash.com/photo-1516280440614-37939bbacd81",
        coverImage: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a",
        activeStatus: "active",
        stats: {
            followers: 1840,
            totalStreams: 15320,
            monthlyListeners: 2910,
        },
    });

    await ArtistVerificationRequest.create({
        _id: ids.artistVerificationRequestClosed,
        artistId: ids.artist,
        userId: ids.artistUser,
        status: "closed",
        note: "Seeded as previously verified artist profile.",
    });

    await Album.create({
        _id: ids.album,
        title: "After Midnight Sessions",
        artistId: ids.artist,
        coverImage: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f",
        releaseDate: daysAgoAt(45, 8, 0),
        status: "active",
        totalDuration: 874,
    });

    await Track.insertMany([
        {
            _id: ids.trackNightDrive,
            title: "Night Drive",
            artist_artistId: ids.artist,
            album_albumId: ids.album,
            audioFiles: [
                {
                    url: "https://example.com/audio/night-drive.mp3",
                    format: "mp3",
                    bitrate: 320,
                    label: "original",
                    priority: 1,
                },
            ],
            duration: 228,
            avatar: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
            coverImage: [
                "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
            ],
            releaseDate: daysAgoAt(30, 8, 0),
            activeStatus: "active",
            approvalStatus: "approved",
        },
        {
            _id: ids.trackMidnightSignals,
            title: "Midnight Signals",
            artist_artistId: ids.artist,
            album_albumId: ids.album,
            audioFiles: [
                {
                    url: "https://example.com/audio/midnight-signals.mp3",
                    format: "mp3",
                    bitrate: 320,
                    label: "original",
                    priority: 1,
                },
            ],
            duration: 241,
            avatar: "https://images.unsplash.com/photo-1511379938547-c1f69419868d",
            coverImage: [
                "https://images.unsplash.com/photo-1511379938547-c1f69419868d",
            ],
            releaseDate: daysAgoAt(28, 8, 0),
            activeStatus: "active",
            approvalStatus: "approved",
        },
        {
            _id: ids.trackStaticDreams,
            title: "Static Dreams",
            artist_artistId: ids.artist,
            album_albumId: ids.album,
            audioFiles: [
                {
                    url: "https://example.com/audio/static-dreams.mp3",
                    format: "mp3",
                    bitrate: 320,
                    label: "original",
                    priority: 1,
                },
            ],
            duration: 194,
            avatar: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3",
            coverImage: [
                "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3",
            ],
            releaseDate: daysAgoAt(20, 8, 0),
            activeStatus: "active",
            approvalStatus: "approved",
        },
        {
            _id: ids.trackRainOnTape,
            title: "Rain On Tape",
            artist_artistId: ids.artist,
            album_albumId: ids.album,
            audioFiles: [
                {
                    url: "https://example.com/audio/rain-on-tape.mp3",
                    format: "mp3",
                    bitrate: 320,
                    label: "original",
                    priority: 1,
                },
            ],
            duration: 211,
            avatar: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea",
            coverImage: [
                "https://images.unsplash.com/photo-1459749411175-04bf5292ceea",
            ],
            releaseDate: daysAgoAt(15, 8, 0),
            activeStatus: "active",
            approvalStatus: "approved",
        },
    ]);

    await Album.findByIdAndUpdate(ids.album, {
        trackList: [
            { trackId: ids.trackNightDrive, order: 1 },
            { trackId: ids.trackMidnightSignals, order: 2 },
            { trackId: ids.trackStaticDreams, order: 3 },
            { trackId: ids.trackRainOnTape, order: 4 },
        ],
        totalDuration: 874,
    });
};

const seedRecentListeningActivity = async () => {
    const sharedTrackImage =
        "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee";
    const sharedAlbumImage =
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f";
    const sharedArtistAvatar =
        "https://images.unsplash.com/photo-1516280440614-37939bbacd81";

    await UserRecentListeningActivity.insertMany([
        {
            _id: ids.activityOne,
            userId: ids.targetUser,
            trackId: ids.trackNightDrive,
            artistId: ids.artist,
            albumId: ids.album,
            trackTitle: "Night Drive",
            trackImage: sharedTrackImage,
            artistName: "Mono Noir",
            artistAvatar: sharedArtistAvatar,
            albumTitle: "After Midnight Sessions",
            albumCoverImage: sharedAlbumImage,
            trackDuration: 228,
            listenedDuration: 212,
            listenPercent: 92.98,
            listenedAt: minutesAgo(35),
            source: "track_detail",
        },
        {
            _id: ids.activityTwo,
            userId: ids.targetUser,
            trackId: ids.trackMidnightSignals,
            artistId: ids.artist,
            albumId: ids.album,
            trackTitle: "Midnight Signals",
            trackImage:
                "https://images.unsplash.com/photo-1511379938547-c1f69419868d",
            artistName: "Mono Noir",
            artistAvatar: sharedArtistAvatar,
            albumTitle: "After Midnight Sessions",
            albumCoverImage: sharedAlbumImage,
            trackDuration: 241,
            listenedDuration: 185,
            listenPercent: 76.76,
            listenedAt: daysAgoAt(1, 22, 10),
            source: "playlist",
        },
        {
            _id: ids.activityThree,
            userId: ids.targetUser,
            trackId: ids.trackStaticDreams,
            artistId: ids.artist,
            albumId: ids.album,
            trackTitle: "Static Dreams",
            trackImage:
                "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3",
            artistName: "Mono Noir",
            artistAvatar: sharedArtistAvatar,
            albumTitle: "After Midnight Sessions",
            albumCoverImage: sharedAlbumImage,
            trackDuration: 194,
            listenedDuration: 194,
            listenPercent: 100,
            listenedAt: daysAgoAt(1, 9, 15),
            source: "search",
        },
        {
            _id: ids.activityFour,
            userId: ids.targetUser,
            trackId: ids.trackRainOnTape,
            artistId: ids.artist,
            albumId: ids.album,
            trackTitle: "Rain On Tape",
            trackImage:
                "https://images.unsplash.com/photo-1459749411175-04bf5292ceea",
            artistName: "Mono Noir",
            artistAvatar: sharedArtistAvatar,
            albumTitle: "After Midnight Sessions",
            albumCoverImage: sharedAlbumImage,
            trackDuration: 211,
            listenedDuration: 148,
            listenPercent: 70.14,
            listenedAt: daysAgoAt(2, 20, 5),
            source: "album",
        },
        {
            _id: ids.activityFive,
            userId: ids.targetUser,
            trackId: ids.trackNightDrive,
            artistId: ids.artist,
            albumId: ids.album,
            trackTitle: "Night Drive",
            trackImage: sharedTrackImage,
            artistName: "Mono Noir",
            artistAvatar: sharedArtistAvatar,
            albumTitle: "After Midnight Sessions",
            albumCoverImage: sharedAlbumImage,
            trackDuration: 228,
            listenedDuration: 201,
            listenPercent: 88.16,
            listenedAt: daysAgoAt(3, 23, 40),
            source: "artist_profile",
        },
        {
            _id: ids.activitySix,
            userId: ids.targetUser,
            trackId: ids.trackMidnightSignals,
            artistId: ids.artist,
            albumId: ids.album,
            trackTitle: "Midnight Signals",
            trackImage:
                "https://images.unsplash.com/photo-1511379938547-c1f69419868d",
            artistName: "Mono Noir",
            artistAvatar: sharedArtistAvatar,
            albumTitle: "After Midnight Sessions",
            albumCoverImage: sharedAlbumImage,
            trackDuration: 241,
            listenedDuration: 241,
            listenPercent: 100,
            listenedAt: daysAgoAt(4, 18, 20),
            source: "playlist",
        },
        {
            _id: ids.activitySeven,
            userId: ids.targetUser,
            trackId: ids.trackStaticDreams,
            artistId: ids.artist,
            albumId: ids.album,
            trackTitle: "Static Dreams",
            trackImage:
                "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3",
            artistName: "Mono Noir",
            artistAvatar: sharedArtistAvatar,
            albumTitle: "After Midnight Sessions",
            albumCoverImage: sharedAlbumImage,
            trackDuration: 194,
            listenedDuration: 152,
            listenPercent: 78.35,
            listenedAt: daysAgoAt(5, 8, 45),
            source: "track_detail",
        },
        {
            _id: ids.activityEight,
            userId: ids.targetUser,
            trackId: ids.trackRainOnTape,
            artistId: ids.artist,
            albumId: ids.album,
            trackTitle: "Rain On Tape",
            trackImage:
                "https://images.unsplash.com/photo-1459749411175-04bf5292ceea",
            artistName: "Mono Noir",
            artistAvatar: sharedArtistAvatar,
            albumTitle: "After Midnight Sessions",
            albumCoverImage: sharedAlbumImage,
            trackDuration: 211,
            listenedDuration: 211,
            listenPercent: 100,
            listenedAt: daysAgoAt(6, 21, 30),
            source: "search",
        },
        {
            _id: ids.activityNine,
            userId: ids.targetUser,
            trackId: ids.trackRainOnTape,
            artistId: ids.artist,
            albumId: ids.album,
            trackTitle: "Rain On Tape",
            trackImage:
                "https://images.unsplash.com/photo-1459749411175-04bf5292ceea",
            artistName: "Mono Noir",
            artistAvatar: sharedArtistAvatar,
            albumTitle: "After Midnight Sessions",
            albumCoverImage: sharedAlbumImage,
            trackDuration: 211,
            listenedDuration: 181,
            listenPercent: 85.78,
            listenedAt: minutesAgo(150),
            source: "album",
        },
        {
            _id: ids.activityTen,
            userId: ids.targetUser,
            trackId: ids.trackStaticDreams,
            artistId: ids.artist,
            albumId: ids.album,
            trackTitle: "Static Dreams",
            trackImage:
                "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3",
            artistName: "Mono Noir",
            artistAvatar: sharedArtistAvatar,
            albumTitle: "After Midnight Sessions",
            albumCoverImage: sharedAlbumImage,
            trackDuration: 194,
            listenedDuration: 194,
            listenPercent: 100,
            listenedAt: minutesAgo(265),
            source: "search",
        },
    ]);
};

const main = async () => {
    const passwords = await buildPasswords();

    await connectDatabase();
    await ensureIndexes();
    await cleanupSeedData();
    await seedUsers(passwords);
    await seedArtistCatalog();
    await seedRecentListeningActivity();

    console.log("Recent listening activity seed completed successfully.");
    console.log("Target user ID:");
    console.log(`  ${TARGET_USER_ID}`);
    console.log("Seed artist account:");
    console.log("  recent.artist.seed@reso.local / Artist@123");
    console.log("Open this route after login:");
    console.log("  /user/recent-listening-activity");
    console.log("Seeded recent activities: 10");
    console.log("Seeded tracks: 4");
};

main()
    .catch((error) => {
        console.error("Recent listening activity seed failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
