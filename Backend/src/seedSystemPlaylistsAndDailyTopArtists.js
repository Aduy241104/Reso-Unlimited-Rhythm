import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import dotenv from "dotenv";
import mongoose from "mongoose";
import redisClient, { connectRedis } from "./config/redisConfig.js";
import Artist from "./models/Artist.js";
import ArtistRanking from "./models/ArtistRanking.js";
import "./models/Genre.js";
import Playlist from "./models/Playlist.js";
import Track from "./models/Track.js";
import User from "./models/User.js";

dotenv.config();
dayjs.extend(utc);
dayjs.extend(timezone);

const ANALYTICS_TIMEZONE =
    process.env.ANALYTICS_TIMEZONE ||
    process.env.CRON_TIMEZONE ||
    "Asia/Ho_Chi_Minh";
const requestedRankingDays = Number.parseInt(
    process.env.SEED_DAILY_TOP_ARTIST_DAYS || "30",
    10
);
const RANKING_DAYS = Math.min(
    90,
    Math.max(1, Number.isFinite(requestedRankingDays) ? requestedRankingDays : 30)
);
const DRY_RUN = process.argv.includes("--dry-run");
const VALIDATE_ONLY = process.argv.includes("--validate-only");
const VERIFY_MEDIA = process.argv.includes("--verify-media");

const seedPlaylistId = (index) =>
    new mongoose.Types.ObjectId(
        `7f01${(index + 1).toString(16).padStart(20, "0")}`
    );

const COVER_PHOTO_IDS = [
    "1501386761578-eac5c94b800a",
    "1493225457124-a3eb161ffa5f",
    "1511379938547-c1f69419868d",
    "1470229722913-7c0e2dbbafd3",
    "1514525253161-7a46d19cd819",
    "1501612780327-45045538702b",
    "1492684223066-81342ee5ff30",
    "1521337581100-8ca9a73a5f79",
    "1496293455970-f8581aae0e3b",
    "1511671782779-c97d3d27a1d4",
    "1520523839897-bd0b52f945a0",
    "1507838153414-b4b713384a76",
];

const coverUrl = (index) =>
    `https://images.unsplash.com/photo-${
        COVER_PHOTO_IDS[index % COVER_PHOTO_IDS.length]
    }?auto=format&fit=crop&w=1200&h=1200&q=82`;

const PLAYLIST_DEFINITIONS = [
    {
        title: "Reso Top Hits Hôm Nay",
        description: "Những ca khúc có lượt nghe nổi bật nhất trên Reso hôm nay.",
        strategy: "plays",
    },
    {
        title: "Top 50 Việt Nam",
        description: "Bảng nhạc Việt được yêu thích và cập nhật cho trải nghiệm trang chủ.",
        strategy: "plays",
    },
    {
        title: "Nhạc Mới Cuối Tuần",
        description: "Các bản phát hành mới dành cho cuối tuần và mục khám phá.",
        strategy: "latest",
    },
    {
        title: "Chill Sau Giờ Làm",
        description: "Không gian nhẹ nhàng để nghỉ ngơi sau một ngày dài.",
        strategy: "genre",
        genreHints: ["chill", "lo-fi", "acoustic"],
    },
    {
        title: "Indie Việt Tuyển Chọn",
        description: "Những giai điệu indie Việt giàu cá tính do Reso tuyển chọn.",
        strategy: "genre",
        genreHints: ["indie", "acoustic"],
    },
    {
        title: "Pop Việt Rực Rỡ",
        description: "Các ca khúc pop dễ nghe dành cho mọi thời điểm trong ngày.",
        strategy: "genre",
        genreHints: ["pop"],
    },
    {
        title: "Tập Luyện Năng Lượng",
        description: "Nhạc tiết tấu mạnh cho chạy bộ, gym và các hoạt động thể thao.",
        strategy: "genre",
        genreHints: ["electronic", "hip-hop", "rock"],
    },
    {
        title: "Acoustic Cà Phê",
        description: "Bản phối mộc và ấm áp cho buổi sáng bên tách cà phê.",
        strategy: "genre",
        genreHints: ["acoustic", "jazz"],
    },
    {
        title: "Đêm Sài Gòn",
        description: "Một hành trình âm nhạc qua những ánh đèn thành phố về đêm.",
        strategy: "likes",
    },
    {
        title: "Electronic Festival",
        description: "Electronic và nhạc lễ hội giàu năng lượng từ các nghệ sĩ Reso.",
        strategy: "genre",
        genreHints: ["electronic"],
    },
    {
        title: "Tập Trung Học Bài",
        description: "Nhạc nền ít xao nhãng dành cho học tập và làm việc sâu.",
        strategy: "genre",
        genreHints: ["lo-fi", "classical", "chill"],
    },
    {
        title: "Reso Editors' Picks",
        description: "Playlist ẩn mẫu để kiểm thử luồng biên tập và bật/tắt hiển thị.",
        strategy: "likes",
        isHidden: true,
    },
];

const buildSampleSources = () => {
    const admin = {
        _id: new mongoose.Types.ObjectId("7f0200000000000000000001"),
        role: "admin",
    };
    const artists = Array.from({ length: 8 }, (_, index) => ({
        _id: new mongoose.Types.ObjectId(
            `7f03${(index + 1).toString(16).padStart(20, "0")}`
        ),
        name: `Sample Artist ${index + 1}`,
        activeStatus: "active",
        stats: {
            followers: 1200 + index * 450,
            totalStreams: 30000 + index * 8500,
            monthlyListeners: 4000 + index * 700,
        },
    }));
    const tracks = Array.from({ length: 48 }, (_, index) => ({
        _id: new mongoose.Types.ObjectId(
            `7f04${(index + 1).toString(16).padStart(20, "0")}`
        ),
        title: `Sample Track ${index + 1}`,
        artist_artistId: artists[index % artists.length]._id,
        duration: 210 + (index % 12) * 11,
        releaseDate: dayjs().subtract(index * 3, "day").toDate(),
        stats: { totalPlay: 2000 + index * 370, totalLike: 180 + index * 29 },
        genreIds: [
            { name: ["Seed · Pop Việt", "Seed · Indie", "Seed · Chill", "Seed · Electronic"][index % 4] },
        ],
    }));

    return { admin, artists, tracks };
};

const loadDatabaseSources = async () => {
    const [admin, artists, tracks] = await Promise.all([
        User.findOne({ role: "admin", activeStatus: "active" })
            .sort({ createdAt: 1, _id: 1 })
            .select("_id role")
            .lean(),
        Artist.find({ activeStatus: "active" })
            .sort({ "stats.totalStreams": -1, "stats.followers": -1, _id: 1 })
            .limit(100)
            .select("_id name activeStatus stats")
            .lean(),
        Track.find({ activeStatus: "active", approvalStatus: "approved" })
            .sort({ "stats.totalPlay": -1, releaseDate: -1, _id: 1 })
            .limit(500)
            .select("_id title artist_artistId genreIds duration releaseDate stats")
            .populate({ path: "genreIds", select: "name" })
            .lean(),
    ]);

    if (!admin) {
        throw new Error(
            "No active admin user found. Run `npm run seed` first or create an admin account."
        );
    }
    if (artists.length < 3) {
        throw new Error(
            `At least 3 active artists are required; found ${artists.length}. Run the comprehensive seed first.`
        );
    }
    if (tracks.length < 10) {
        throw new Error(
            `At least 10 active approved tracks are required; found ${tracks.length}. Run the comprehensive seed first.`
        );
    }

    return { admin, artists, tracks };
};

const numericStat = (document, field) => Number(document?.stats?.[field]) || 0;
const byPlays = (left, right) =>
    numericStat(right, "totalPlay") - numericStat(left, "totalPlay") ||
    String(left._id).localeCompare(String(right._id));
const byLikes = (left, right) =>
    numericStat(right, "totalLike") - numericStat(left, "totalLike") ||
    byPlays(left, right);
const byLatest = (left, right) =>
    new Date(right.releaseDate || 0) - new Date(left.releaseDate || 0) ||
    byPlays(left, right);

const matchesGenre = (track, genreHints = []) => {
    if (genreHints.length === 0) return true;
    const genreNames = (track.genreIds || [])
        .map((genre) => String(genre?.name || "").toLowerCase())
        .join(" ");
    return genreHints.some((hint) => genreNames.includes(hint));
};

const rotate = (items, offset) => {
    if (items.length === 0) return [];
    const start = offset % items.length;
    return [...items.slice(start), ...items.slice(0, start)];
};

const selectPlaylistTracks = (tracks, definition, definitionIndex) => {
    const sorter = definition.strategy === "latest"
        ? byLatest
        : definition.strategy === "likes"
            ? byLikes
            : byPlays;
    const sorted = [...tracks].sort(sorter);
    const genreMatches = definition.strategy === "genre"
        ? sorted.filter((track) => matchesGenre(track, definition.genreHints))
        : [];
    const preferred = genreMatches.length >= 6 ? genreMatches : sorted;
    const rotatedPreferred = rotate(preferred, definitionIndex * 5);
    const selected = [];
    const seen = new Set();

    for (const track of [...rotatedPreferred, ...rotate(sorted, definitionIndex * 7)]) {
        const key = String(track._id);
        if (seen.has(key)) continue;
        seen.add(key);
        selected.push(track);
        if (selected.length === Math.min(20, tracks.length)) break;
    }

    return selected;
};

const buildSystemPlaylists = ({ admin, tracks, anchor }) =>
    PLAYLIST_DEFINITIONS.map((definition, index) => {
        const selected = selectPlaylistTracks(tracks, definition, index);
        const createdAt = anchor.subtract(24 - index, "hour").toDate();
        return {
            _id: seedPlaylistId(index),
            userId: admin._id,
            title: definition.title,
            description: definition.description,
            type: "system",
            coverImage: coverUrl(index),
            isPublic: true,
            isHidden: Boolean(definition.isHidden),
            trackCount: selected.length,
            totalDuration: selected.reduce(
                (sum, track) => sum + (Number(track.duration) || 0),
                0
            ),
            tracks: selected.map((track, trackIndex) => ({
                trackId: track._id,
                addedAt: anchor.subtract(selected.length - trackIndex, "minute").toDate(),
                order: trackIndex,
            })),
            createdAt,
            updatedAt: createdAt,
        };
    });

const buildArtistSignals = (artists, tracks) => {
    const trackSignals = new Map();
    tracks.forEach((track) => {
        const artistKey = String(track.artist_artistId?._id || track.artist_artistId || "");
        if (!artistKey) return;
        const current = trackSignals.get(artistKey) || {
            trackCount: 0,
            totalTrackPlays: 0,
            totalTrackLikes: 0,
        };
        current.trackCount += 1;
        current.totalTrackPlays += numericStat(track, "totalPlay");
        current.totalTrackLikes += numericStat(track, "totalLike");
        trackSignals.set(artistKey, current);
    });

    return artists.map((artist, index) => ({
        artist,
        index,
        ...(trackSignals.get(String(artist._id)) || {
            trackCount: 0,
            totalTrackPlays: 0,
            totalTrackLikes: 0,
        }),
    }));
};

const buildDailyArtistRankings = ({ artists, tracks, anchor }) => {
    const signals = buildArtistSignals(artists, tracks);
    const documents = [];

    for (let dayOffset = -(RANKING_DAYS - 1); dayOffset <= 0; dayOffset += 1) {
        const targetDay = anchor.startOf("day").add(dayOffset, "day");
        const dateKey = targetDay.format("YYYY-MM-DD");
        const date = new Date(`${dateKey}T00:00:00.000Z`);
        const daySerial = Number(dateKey.replaceAll("-", ""));
        const ranked = signals
            .map((signal) => {
                const artistStreams = numericStat(signal.artist, "totalStreams");
                const artistFollowers = numericStat(signal.artist, "followers");
                const baseline = Math.max(
                    120,
                    Math.round(artistStreams / 90 + signal.totalTrackPlays / 600)
                );
                const wave = ((daySerial * (signal.index + 3) + signal.index * 97) % 360) - 90;
                const playCount = Math.max(40, baseline + wave);
                const uniqueListeners = Math.min(
                    playCount,
                    Math.max(20, Math.round(playCount * (0.52 + (signal.index % 5) * 0.055)))
                );
                const completedPlayCount = Math.min(
                    playCount,
                    Math.round(playCount * (0.66 + (signal.index % 4) * 0.06))
                );
                const totalTracksPlayed = Math.max(1, signal.trackCount);
                const score = Number(
                    (
                        playCount +
                        uniqueListeners * 2 +
                        completedPlayCount * 0.5 +
                        totalTracksPlayed * 5 +
                        artistFollowers * 0.01 +
                        signal.totalTrackLikes * 0.02
                    ).toFixed(2)
                );
                return {
                    artistId: signal.artist._id,
                    playCount,
                    uniqueListeners,
                    completedPlayCount,
                    totalTracksPlayed,
                    score,
                };
            })
            .sort(
                (left, right) =>
                    right.score - left.score ||
                    right.playCount - left.playCount ||
                    String(left.artistId).localeCompare(String(right.artistId))
            )
            .slice(0, 20)
            .map((item, index) => ({ ...item, rank: index + 1 }));

        documents.push({
            periodType: "daily",
            dateKey,
            date,
            rankings: ranked,
        });
    }

    return documents;
};

const validateDocuments = ({ playlists, dailyRankings }) => {
    for (const playlist of playlists) {
        const error = new Playlist(playlist).validateSync();
        if (error) throw new Error(`System playlist validation failed: ${error.message}`);
    }
    for (const ranking of dailyRankings) {
        const error = new ArtistRanking(ranking).validateSync();
        if (error) throw new Error(`Daily artist ranking validation failed: ${error.message}`);
    }
};

const verifyCovers = async () => {
    if (typeof fetch !== "function") {
        throw new Error("--verify-media requires Node.js 18 or newer.");
    }
    const verifyOne = async (url) => {
        let lastError;
        for (let attempt = 1; attempt <= 3; attempt += 1) {
            try {
                let response = await fetch(url, {
                    method: "HEAD",
                    redirect: "follow",
                    signal: AbortSignal.timeout(15000),
                });
                if (!response.ok) {
                    response = await fetch(url, {
                        method: "GET",
                        redirect: "follow",
                        headers: { Range: "bytes=0-1023" },
                        signal: AbortSignal.timeout(15000),
                    });
                }
                const contentType = response.headers.get("content-type") || "";
                if (response.ok && contentType.startsWith("image/")) return;
                lastError = new Error(
                    `Playlist cover is unavailable (${response.status}, ${contentType}): ${url}`
                );
            } catch (error) {
                lastError = error;
            }
        }
        throw lastError;
    };

    const concurrency = 4;
    for (let start = 0; start < COVER_PHOTO_IDS.length; start += concurrency) {
        const indexes = Array.from(
            { length: Math.min(concurrency, COVER_PHOTO_IDS.length - start) },
            (_, offset) => start + offset
        );
        await Promise.all(indexes.map((index) => verifyOne(coverUrl(index))));
    }
    console.log(`Verified ${COVER_PHOTO_IDS.length} system-playlist cover URLs.`);
};

const writeSeedData = async ({ playlists, dailyRankings }) => {
    for (const playlist of playlists) {
        await Playlist.replaceOne({ _id: playlist._id }, playlist, { upsert: true });
    }
    for (const ranking of dailyRankings) {
        await ArtistRanking.replaceOne(
            { periodType: "daily", dateKey: ranking.dateKey },
            ranking,
            { upsert: true }
        );
    }
};

const invalidateDailyTopArtistCache = async () => {
    const connected = await connectRedis();
    if (!connected || !redisClient.isOpen) return 0;

    let cursor = "0";
    let deletedCount = 0;
    do {
        const result = await redisClient.scan(cursor, {
            MATCH: "top_artists:daily:*",
            COUNT: 100,
        });
        cursor = String(result.cursor);
        if (result.keys.length > 0) {
            deletedCount += result.keys.length;
            await redisClient.del(result.keys);
        }
    } while (cursor !== "0");

    return deletedCount;
};

const printSummary = ({ sources, playlists, dailyRankings, mode }) => {
    const visiblePlaylists = playlists.filter((playlist) => !playlist.isHidden).length;
    console.log("\nSystem content seed summary");
    console.log(`Mode: ${mode}`);
    console.log(`Timezone: ${ANALYTICS_TIMEZONE}`);
    console.log(`Source tracks / artists: ${sources.tracks.length} / ${sources.artists.length}`);
    console.log(`System playlists: ${playlists.length} (${visiblePlaylists} visible, ${playlists.length - visiblePlaylists} hidden)`);
    console.log(`Daily top-artist documents: ${dailyRankings.length}`);
    console.log(`Ranking range: ${dailyRankings[0].dateKey} -> ${dailyRankings.at(-1).dateKey}`);
};

const main = async () => {
    const anchor = dayjs().tz(ANALYTICS_TIMEZONE);
    let sources;

    if (VALIDATE_ONLY) {
        sources = buildSampleSources();
    } else {
        if (!process.env.DATABASE) {
            throw new Error("DATABASE is missing. Configure .env or use --validate-only.");
        }
        mongoose.set("autoIndex", false);
        await mongoose.connect(process.env.DATABASE);
        sources = await loadDatabaseSources();
    }

    const playlists = buildSystemPlaylists({ ...sources, anchor });
    const dailyRankings = buildDailyArtistRankings({ ...sources, anchor });
    validateDocuments({ playlists, dailyRankings });
    if (VERIFY_MEDIA) await verifyCovers();

    if (!DRY_RUN && !VALIDATE_ONLY) {
        await writeSeedData({ playlists, dailyRankings });
        const deletedCacheKeys = await invalidateDailyTopArtistCache();
        console.log(`Invalidated ${deletedCacheKeys} daily top-artist cache keys.`);
    }

    printSummary({
        sources,
        playlists,
        dailyRankings,
        mode: VALIDATE_ONLY
            ? "validate-only (sample IDs, MongoDB was not used)"
            : DRY_RUN
                ? "dry-run (MongoDB was read but not changed)"
                : "database seed completed",
    });
};

main()
    .catch((error) => {
        console.error("System playlist/daily top-artist seed failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        if (redisClient.isOpen) {
            await redisClient.quit();
        }
    });
