import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import dotenv from "dotenv";
import mongoose from "mongoose";
import models from "../src/models/index.js";
import redisClient, { connectRedis } from "../src/config/redisConfig.js";

dotenv.config();
dayjs.extend(utc);
dayjs.extend(timezone);

const {
    Playlist,
    Track,
    TrackDailyRanking,
    TrackMonthlyRanking,
    User,
} = models;

const ANALYTICS_TIMEZONE =
    process.env.ANALYTICS_TIMEZONE ||
    process.env.CRON_TIMEZONE ||
    "Asia/Ho_Chi_Minh";
const DRY_RUN = process.argv.includes("--dry-run");

const SYSTEM_PLAYLIST_DEFINITIONS = [
    {
        title: "Bang xep hang hom nay",
        description: "Danh sach bai hat top theo daily ranking hien tai.",
        resolver: "daily",
    },
    {
        title: "Top track thang nay",
        description: "Danh sach bai hat top theo monthly ranking hien tai.",
        resolver: "monthly",
    },
    {
        title: "Moi phat hanh noi bat",
        description: "Nhung bai hat moi phat hanh da du dieu kien hien thi.",
        resolver: "latest",
    },
];

const buildTrackUpdate = (track, now) => {
    const releaseDate = track.releaseDate ? new Date(track.releaseDate) : null;
    const releaseTime = releaseDate?.getTime();
    const isApproved = track.approvalStatus === "approved";
    const isVisible = ["active", "hidden"].includes(track.activeStatus);

    if (
        isApproved &&
        isVisible &&
        (!Number.isFinite(releaseTime) || releaseTime <= now.getTime())
    ) {
        return {
            releaseStatus: "released",
            releasedAt: track.releasedAt || releaseDate || track.createdAt || now,
        };
    }

    if (
        isApproved &&
        Number.isFinite(releaseTime) &&
        releaseTime > now.getTime()
    ) {
        return {
            releaseStatus: "scheduled",
            releasedAt: null,
        };
    }

    return {
        releaseStatus: "unreleased",
        releasedAt: null,
    };
};

const getSystemOwner = async () => {
    const adminUser = await User.findOne({ role: "admin" })
        .sort({ createdAt: 1, _id: 1 })
        .select("_id")
        .lean();

    if (adminUser?._id) {
        return adminUser._id;
    }

    const fallbackUser = await User.findOne({})
        .sort({ createdAt: 1, _id: 1 })
        .select("_id")
        .lean();

    if (!fallbackUser?._id) {
        throw new Error("No user found to own system playlists.");
    }

    return fallbackUser._id;
};

const buildPlaylistTracks = (tracks) =>
    tracks.map((track, index) => ({
        trackId: track._id,
        order: index,
        addedAt: new Date(),
    }));

const isDisplayableTrack = (track) =>
    track &&
    track.activeStatus === "active" &&
    track.approvalStatus === "approved" &&
    track.releaseStatus === "released";

const resolveDailyRankingTracks = async ({ now, effectiveTrackMap }) => {
    const dateKey = dayjs(now).tz(ANALYTICS_TIMEZONE).format("YYYY-MM-DD");
    const rankingDocument =
        await TrackDailyRanking.findOne({ dateKey }).sort({ date: -1, _id: -1 }).lean();

    return (rankingDocument?.rankings || [])
        .map((item) => effectiveTrackMap.get(String(item.trackId)))
        .filter(isDisplayableTrack)
        .slice(0, 20);
};

const resolveMonthlyRankingTracks = async ({ now, effectiveTrackMap }) => {
    const month = dayjs(now).tz(ANALYTICS_TIMEZONE);
    const rankingDocument =
        await TrackMonthlyRanking.findOne({
            year: month.year(),
            month: month.month() + 1,
        })
            .lean();

    return (rankingDocument?.rankings || [])
        .map((item) => effectiveTrackMap.get(String(item.trackId)))
        .filter(isDisplayableTrack)
        .slice(0, 20);
};

const resolveLatestReleasedTracks = async ({ effectiveTrackMap }) =>
    [...effectiveTrackMap.values()]
        .filter(isDisplayableTrack)
        .sort((left, right) => {
            const leftTime = new Date(left.releasedAt || left.releaseDate || left.createdAt || 0).getTime();
            const rightTime = new Date(right.releasedAt || right.releaseDate || right.createdAt || 0).getTime();
            return rightTime - leftTime;
        })
        .slice(0, 20);

const upsertSystemPlaylists = async ({ ownerId, now, dryRun, effectiveTrackMap }) => {
    const dailyTracks = await resolveDailyRankingTracks({ now, effectiveTrackMap });
    const monthlyTracks = await resolveMonthlyRankingTracks({ now, effectiveTrackMap });
    const latestTracks = await resolveLatestReleasedTracks({ effectiveTrackMap });

    const playlistSources = {
        daily: dailyTracks,
        monthly: monthlyTracks,
        latest: latestTracks,
    };

    const summaries = [];

    for (const definition of SYSTEM_PLAYLIST_DEFINITIONS) {
        const tracks = playlistSources[definition.resolver] || [];
        const payload = {
            userId: ownerId,
            title: definition.title,
            description: definition.description,
            type: "system",
            coverImage: "",
            isPublic: true,
            isHidden: false,
            trackCount: tracks.length,
            totalDuration: tracks.reduce(
                (sum, track) => sum + (track.duration || 0),
                0
            ),
            tracks: buildPlaylistTracks(tracks),
        };

        if (!dryRun) {
            await Playlist.updateOne(
                { type: "system", title: definition.title },
                { $set: payload },
                { upsert: true }
            );
        }

        summaries.push({
            title: definition.title,
            trackCount: tracks.length,
        });
    }

    return summaries;
};

const clearTopTrackCaches = async () => {
    const patterns = ["top_tracks:daily:*", "top_tracks:monthly:*"];
    const deletedKeys = [];

    for (const pattern of patterns) {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
            await redisClient.del(keys);
            deletedKeys.push(...keys);
        }
    }

    return deletedKeys;
};

const main = async () => {
    if (!process.env.DATABASE) {
        throw new Error("DATABASE is missing in .env.");
    }

    const now = dayjs.tz("2026-08-06T12:00:00", ANALYTICS_TIMEZONE).toDate();

    await mongoose.connect(process.env.DATABASE);

    const tracks = await Track.find({})
        .select("_id releaseDate releaseStatus releasedAt activeStatus approvalStatus createdAt duration")
        .lean();

    const trackUpdates = tracks
        .map((track) => {
            const nextState = buildTrackUpdate(track, now);
            const changed =
                track.releaseStatus !== nextState.releaseStatus ||
                String(track.releasedAt || "") !== String(nextState.releasedAt || "");

            return changed
                ? {
                    _id: track._id,
                    ...nextState,
                }
                : null;
        })
        .filter(Boolean);

    if (!DRY_RUN) {
        for (const item of trackUpdates) {
            await Track.updateOne(
                { _id: item._id },
                {
                    $set: {
                        releaseStatus: item.releaseStatus,
                        releasedAt: item.releasedAt,
                    },
                }
            );
        }
    }

    const effectiveTrackMap = new Map(
        tracks.map((track) => {
            const override = trackUpdates.find(
                (item) => String(item._id) === String(track._id)
            );
            return [
                String(track._id),
                override
                    ? {
                        ...track,
                        releaseStatus: override.releaseStatus,
                        releasedAt: override.releasedAt,
                    }
                    : track,
            ];
        })
    );

    const ownerId = await getSystemOwner();
    const playlistSummaries = await upsertSystemPlaylists({
        ownerId,
        now,
        dryRun: DRY_RUN,
        effectiveTrackMap,
    });

    let deletedCacheKeys = [];
    let redisConnected = false;
    if (!DRY_RUN) {
        redisConnected = await connectRedis();
        if (redisConnected) {
            deletedCacheKeys = await clearTopTrackCaches();
        }
    }

    console.log("Repair top track visibility summary");
    console.log(`Mode: ${DRY_RUN ? "dry-run" : "write"}`);
    console.log(`Tracks checked: ${tracks.length}`);
    console.log(`Tracks to update: ${trackUpdates.length}`);
    console.log("System playlists:");
    playlistSummaries.forEach((item) => {
        console.log(`- ${item.title}: ${item.trackCount} tracks`);
    });
    if (!DRY_RUN) {
        console.log(
            `Redis cache cleared: ${redisConnected ? deletedCacheKeys.length : 0} keys`
        );
    }
};

main()
    .catch((error) => {
        console.error("Repair failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        try {
            if (redisClient.isOpen) {
                await redisClient.quit();
            }
        } finally {
            if (mongoose.connection.readyState !== 0) {
                await mongoose.disconnect();
            }
        }
    });
