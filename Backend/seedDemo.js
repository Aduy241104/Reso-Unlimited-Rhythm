import bcrypt from "bcrypt";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { createClient } from "redis";
import connectMongoose from "./src/config/db.js";
import models from "./src/models/index.js";

dotenv.config();

const {
    Album,
    Artist,
    ArtistDailyStat,
    ArtistMonthlyStat,
    ArtistRanking,
    ArtistRevenueSummary,
    ListenEvent,
    Podcast,
    PodcastMonthlyStat,
    RevenuePeriod,
    Track,
    TrackDailyRanking,
    TrackDailyStat,
    TrackMonthlyRanking,
    TrackMonthlyStat,
    User,
} = models;

const SEED_PREFIX = "7a";
const SEED_PASSWORD = process.env.SEED_PASSWORD || "Seed@123";
const REVENUE_START_YEAR = 2025;
const REVENUE_START_MONTH = 6;
const REVENUE_PERIOD_COUNT = 15;
const RANKING_YEAR = 2026;
const RANKING_MONTH = 8;
const RANKING_START_DAY = 1;
const RANKING_END_DAY = 30;
const TIMEZONE_OFFSET = "+07:00";

// The 7a prefix keeps this fixture's ObjectIds separate and deterministic.
const seedObjectId = (scope, index) =>
    new mongoose.Types.ObjectId(
        `${SEED_PREFIX}${scope.toString(16).padStart(2, "0")}${index
            .toString(16)
            .padStart(20, "0")}`
    );

const dateKey = (year, month, day) =>
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const localDate = (year, month, day, hour = 12) =>
    new Date(`${dateKey(year, month, day)}T${String(hour).padStart(2, "0")}:00:00${TIMEZONE_OFFSET}`);

const monthSequence = Array.from({ length: REVENUE_PERIOD_COUNT }, (_, index) => {
    const zeroBasedMonth = REVENUE_START_MONTH - 1 + index;
    const year = REVENUE_START_YEAR + Math.floor(zeroBasedMonth / 12);
    const month = (zeroBasedMonth % 12) + 1;
    return { year, month };
});

const ensureById = async (Model, id, fields) => {
    const existing = await Model.findById(id).lean();
    if (existing) return existing;
    return (await Model.create({ _id: id, ...fields })).toObject();
};

const ensureManyById = async (Model, documents) => {
    if (documents.length === 0) return 0;

    const ids = documents.map((document) => document._id);
    const existing = await Model.find({ _id: { $in: ids } }).select("_id").lean();
    const existingIds = new Set(existing.map((document) => String(document._id)));
    const missing = documents.filter((document) => !existingIds.has(String(document._id)));

    if (missing.length > 0) {
        await Model.insertMany(missing, { ordered: true });
    }

    return missing.length;
};

const buildUsers = async () => {
    const password = await bcrypt.hash(SEED_PASSWORD, 10);
    const users = [];

    for (let index = 1; index <= 3; index += 1) {
        users.push(
            await ensureById(User, seedObjectId(1, index), {
                email: `demo.rank.artist${index}@gmail.com`,
                password,
                authProvider: "local",
                role: "artist",
                activeStatus: "active",
                emailVerified: true,
                profile: {
                    fullName: ["Nguyễn Minh Aurora", "Trần Lam River", "Lê An Horizon"][index - 1],
                    country: "Vietnam",
                },
            })
        );
    }

    return users;
};

const buildArtists = async (users) => {
    const names = ["Demo Aurora", "Demo Lam River", "Demo Horizon"];
    const bios = [
        "Nghệ sĩ pop điện tử với những bản nhạc giàu năng lượng.",
        "Dự án indie kết hợp chất liệu acoustic và alternative.",
        "Âm thanh chill hiện đại dành cho những buổi tối thư giãn.",
    ];

    return Promise.all(
        names.map((name, index) =>
            ensureById(Artist, seedObjectId(2, index + 1), {
                userId: users[index]._id,
                name,
                bio: bios[index],
                avatar: `https://images.unsplash.com/photo-${[
                    "1500648767791-00dcc994a43e",
                    "1506794778202-cad84cf45f1d",
                    "1535713875002-d1d0cf377fde",
                ][index]}?auto=format&fit=crop&w=800&h=800&q=82`,
                coverImage: `https://images.unsplash.com/photo-${[
                    "1493225457124-a3eb161ffa5f",
                    "1514525253161-7a46d19cd819",
                    "1506157786151-b8491531f063",
                ][index]}?auto=format&fit=crop&w=1600&h=700&q=82`,
                stats: {
                    followers: 1200 + index * 650,
                    totalStreams: 25000 + index * 12000,
                    monthlyListeners: 7000 + index * 2300,
                },
                activeStatus: "active",
                identityVerification: { status: "verified", verifiedAt: localDate(2025, 5, 20) },
            })
        )
    );
};

const buildAlbums = async (artists) =>
    Promise.all(
        artists.map((artist, index) =>
            ensureById(Album, seedObjectId(3, index + 1), {
                title: ["Demo Neon Season", "Demo River Notes", "Demo Afterglow"][index],
                artistId: artist._id,
                coverImage: `https://images.unsplash.com/photo-${[
                    "1511379938547-c1f69419868d",
                    "1501386761578-eac5c94b800a",
                    "1524368535928-5b5e00ddc76b",
                ][index]}?auto=format&fit=crop&w=1200&h=1200&q=82`,
                releaseDate: localDate(2025, 5 + index, 10),
                status: "active",
            })
        )
    );

const buildTracks = async (artists, albums) => {
    const titles = [
        "City Lights",
        "Electric Heart",
        "River Without Rain",
        "Paper Boats",
        "Afterglow Avenue",
        "Quiet Satellites",
    ];
    const tracks = [];

    for (let index = 0; index < titles.length; index += 1) {
        const artistIndex = Math.floor(index / 2);
        tracks.push(
            await ensureById(Track, seedObjectId(4, index + 1), {
                title: titles[index],
                versionTitle: "",
                description: `Bản phát hành demo ${titles[index]} dành cho dữ liệu xếp hạng và doanh thu.`,
                tags: ["demo", "top-rank", index % 2 === 0 ? "pop" : "indie"],
                artist_artistId: artists[artistIndex]._id,
                album_albumId: albums[artistIndex]._id,
                audioFiles: [
                    {
                        url: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${(index % 6) + 1}.mp3`,
                        format: "mp3",
                        bitrate: 320,
                        label: "original",
                        priority: 1,
                    },
                ],
                duration: 198 + index * 17,
                avatar: `https://images.unsplash.com/photo-${[
                    "1511379938547-c1f69419868d",
                    "1514525253161-7a46d19cd819",
                    "1501386761578-eac5c94b800a",
                    "1493225457124-a3eb161ffa5f",
                    "1524368535928-5b5e00ddc76b",
                    "1506157786151-b8491531f063",
                ][index]}?auto=format&fit=crop&w=1200&h=1200&q=82`,
                releaseDate: localDate(2025, 5 + artistIndex, 15),
                releaseStatus: "released",
                releasedAt: localDate(2025, 5 + artistIndex, 15),
                activeStatus: "active",
                approvalStatus: "approved",
                stats: {
                    totalLike: 300 + index * 125,
                    totalPlay: 18000 + index * 4200,
                },
                copyright: {
                    isOriginal: true,
                    primaryCopyrightType: "original",
                    rightsConfirmed: true,
                    declarationAccepted: true,
                    copyrightStatus: "verified",
                    copyrightOwner: artists[artistIndex].name,
                    recordingOwner: artists[artistIndex].name,
                },
            })
        );
    }

    for (let artistIndex = 0; artistIndex < albums.length; artistIndex += 1) {
        await Album.findByIdAndUpdate(albums[artistIndex]._id, {
            $set: {
                trackList: tracks
                    .filter((_, trackIndex) => Math.floor(trackIndex / 2) === artistIndex)
                    .map((track, order) => ({ trackId: track._id, order: order + 1 })),
                totalDuration: tracks
                    .filter((_, trackIndex) => Math.floor(trackIndex / 2) === artistIndex)
                    .reduce((sum, track) => sum + track.duration, 0),
            },
        });
    }

    return tracks;
};

const buildPodcasts = async (artists) => {
    const titles = ["Demo Music Room", "Demo Behind The Song", "Demo Night Frequencies"];

    return Promise.all(
        titles.map((title, index) =>
            ensureById(Podcast, seedObjectId(5, index + 1), {
                creator: artists[index]._id,
                title,
                description: "Podcast demo phục vụ kiểm tra doanh thu nội dung âm thanh.",
                audioUrl: `https://cdn.example.com/demo/podcast-${index + 1}.mp3`,
                coverImageUrl: `https://images.unsplash.com/photo-${[
                    "1590602847861-f357a9332bbc",
                    "1478737270239-2f02b77fc618",
                    "1524368535928-5b5e00ddc76b",
                ][index]}?auto=format&fit=crop&w=1200&h=1200&q=82`,
                duration: 1500 + index * 420,
                releaseDate: localDate(2025, 6 + index, 5),
                releaseStatus: "released",
                releasedAt: localDate(2025, 6 + index, 5),
                approvalStatus: "approved",
                visibility: "public",
                copyrightType: "original",
                copyrightConfirmed: true,
                stats: { totalListen: 4200 + index * 1800 },
            })
        )
    );
};

const buildRevenuePeriods = async () => {
    const periods = [];

    for (let index = 0; index < monthSequence.length; index += 1) {
        const { year, month } = monthSequence[index];
        const periodStart = new Date(Date.UTC(year, month - 1, 1));
        const periodEnd = new Date(Date.UTC(year, month, 1));
        const premiumRevenue = 12_000_000 + index * 750_000;
        const artistPool = Math.round(premiumRevenue * 0.7);

        const periodFields = {
                year,
                month,
                periodStart,
                periodEnd,
                status: "open",
                totalPremiumRevenue: premiumRevenue,
                totalArtistPool: artistPool,
                totalPlatformRevenue: premiumRevenue - artistPool,
                totalEligibleStreams: 1800 + index * 140,
                successfulTransactions: 12 + index,
                dailyStats: Array.from({ length: 5 }, (_, dayIndex) => ({
                    day: dayIndex + 1,
                    date: new Date(Date.UTC(year, month - 1, dayIndex + 1)),
                    premiumRevenue: Math.round(premiumRevenue / 5),
                    artistPool: Math.round(artistPool / 5),
                    platformRevenue: Math.round((premiumRevenue - artistPool) / 5),
                    successfulTransactions: 2 + (dayIndex % 2),
                })),
                lastAggregatedAt: null,
                closedAt: null,
                calculatedAt: null,
                confirmedAt: null,
                confirmedBy: null,
        };

        // RevenuePeriod has a unique business key on year + month. Do not
        // rely on the deterministic _id here because another seed may have
        // already created the same accounting period with a different _id.
        const period = await RevenuePeriod.findOneAndUpdate(
            { year, month },
            { $setOnInsert: { _id: seedObjectId(6, index + 1), ...periodFields } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        ).lean();

        periods.push(period);
    }

    return periods;
};

const buildMonthlyStats = async ({ artists, tracks, podcasts }) => {
    let trackStatCount = 0;
    let podcastStatCount = 0;
    let artistStatCount = 0;
    let summaryCount = 0;

    for (let periodIndex = 0; periodIndex < monthSequence.length; periodIndex += 1) {
        const { year, month } = monthSequence[periodIndex];

        for (let trackIndex = 0; trackIndex < tracks.length; trackIndex += 1) {
            const playCount = 280 + periodIndex * 24 + (tracks.length - trackIndex) * 31;
            const eligibleStreams = Math.round(playCount * 0.82);
            await ensureById(TrackMonthlyStat, seedObjectId(7, periodIndex * 10 + trackIndex + 1), {
                trackId: tracks[trackIndex]._id,
                year,
                month,
                playCount,
                uniqueListeners: Math.round(playCount * 0.68),
                revenue: {
                    eligibleStreams,
                    revenueAmount: eligibleStreams * 1450,
                    artistRevenueAmount: eligibleStreams * 1015,
                    calculatedAt: null,
                },
            });
            trackStatCount += 1;
        }

        for (let podcastIndex = 0; podcastIndex < podcasts.length; podcastIndex += 1) {
            const listenCount = 150 + periodIndex * 18 + (podcasts.length - podcastIndex) * 20;
            const eligibleStreams = Math.round(listenCount * 0.78);
            await ensureById(PodcastMonthlyStat, seedObjectId(8, periodIndex * 10 + podcastIndex + 1), {
                podcastId: podcasts[podcastIndex]._id,
                year,
                month,
                listenCount,
                eligibleStreams,
                revenue: {
                    eligibleStreams,
                    revenueAmount: eligibleStreams * 1300,
                    artistRevenueAmount: eligibleStreams * 910,
                    calculatedAt: null,
                },
            });
            podcastStatCount += 1;
        }

        for (let artistIndex = 0; artistIndex < artists.length; artistIndex += 1) {
            const totalStreams = 900 + periodIndex * 80 + (artists.length - artistIndex) * 95;
            const revenueAmount = totalStreams * 1015;
            await ensureById(ArtistMonthlyStat, seedObjectId(9, periodIndex * 10 + artistIndex + 1), {
                artistId: artists[artistIndex]._id,
                year,
                month,
                newFollowers: 45 + periodIndex * 3 + artistIndex * 8,
                totalFollowers: 1200 + periodIndex * 100 + artistIndex * 650,
                totalStreams,
                revenueAmount,
            });
            artistStatCount += 1;

            await ensureById(ArtistRevenueSummary, seedObjectId(10, periodIndex * 10 + artistIndex + 1), {
                artistId: artists[artistIndex]._id,
                year,
                month,
                totalEligibleStreams: Math.round(totalStreams * 0.82),
                grossRevenueAmount: revenueAmount,
                artistRevenueAmount: revenueAmount,
                platformRevenueAmount: Math.round(revenueAmount * 0.3),
                withdrawnAmount: 0,
                availableAmount: revenueAmount,
                status: "pending",
                calculatedAt: null,
                confirmedAt: null,
                confirmedBy: null,
            });
            summaryCount += 1;
        }
    }

    return { trackStatCount, podcastStatCount, artistStatCount, summaryCount };
};

const buildHistoricalListenEvents = async ({ artists, tracks, podcasts }) => {
    let eventIndex = 1;
    const events = [];

    for (let periodIndex = 0; periodIndex < monthSequence.length; periodIndex += 1) {
        const { year, month } = monthSequence[periodIndex];

        for (let trackIndex = 0; trackIndex < tracks.length; trackIndex += 1) {
            const artistIndex = Math.floor(trackIndex / 2);
            const copies = 8 + ((periodIndex + trackIndex) % 5) * 3;

            for (let copy = 0; copy < copies; copy += 1) {
                const id = seedObjectId(11, eventIndex);
                events.push({
                    _id: id,
                    guestId: `7a000000-0000-4000-8000-${eventIndex.toString(16).padStart(12, "0")}`,
                    contentType: "track",
                    trackId: tracks[trackIndex]._id,
                    podcastId: null,
                    artistId: artists[artistIndex]._id,
                    listenedAt: localDate(year, month, 2 + (copy % 20), 8 + (copy % 10)),
                    trackDuration: tracks[trackIndex].duration,
                    listenedDuration: tracks[trackIndex].duration,
                    listenPercent: 100,
                    requiredPercent: 50,
                    source: "album",
                    isValidStream: true,
                    duration: tracks[trackIndex].duration,
                    completed: true,
                    skipped: false,
                });
                eventIndex += 1;
            }
        }

        for (let podcastIndex = 0; podcastIndex < podcasts.length; podcastIndex += 1) {
            const copies = 6 + ((periodIndex + podcastIndex) % 4) * 2;

            for (let copy = 0; copy < copies; copy += 1) {
                const podcast = podcasts[podcastIndex];
                const id = seedObjectId(11, eventIndex);
                events.push({
                    _id: id,
                    guestId: `7a000000-0000-4000-8000-${eventIndex.toString(16).padStart(12, "0")}`,
                    contentType: "podcast",
                    trackId: null,
                    podcastId: podcast._id,
                    artistId: artists[podcastIndex]._id,
                    listenedAt: localDate(year, month, 3 + (copy % 20), 10 + (copy % 8)),
                    trackDuration: podcast.duration,
                    listenedDuration: podcast.duration,
                    listenPercent: 100,
                    requiredPercent: 50,
                    source: "podcast_detail",
                    isValidStream: true,
                    duration: podcast.duration,
                    completed: true,
                    skipped: false,
                });
                eventIndex += 1;
            }
        }
    }

    await ensureManyById(ListenEvent, events);
    return events.length;
};

const buildAugustRankings = async ({ artists, tracks }) => {
    let dailyTrackStats = 0;
    let dailyArtistStats = 0;
    let dailyTrackRankings = 0;
    let dailyArtistRankings = 0;

    for (let day = RANKING_START_DAY; day <= RANKING_END_DAY; day += 1) {
        const dayKey = dateKey(RANKING_YEAR, RANKING_MONTH, day);
        const dayDate = localDate(RANKING_YEAR, RANKING_MONTH, day);
        const trackRankings = tracks.map((track, trackIndex) => {
            const playCount = 2400 - trackIndex * 210 + day * 17;
            return {
                trackId: track._id,
                playCount,
                uniqueListeners: Math.round(playCount * 0.64),
                averageListenDuration: track.duration * 0.78,
                skipCount: Math.round(playCount * 0.08),
                rank: trackIndex + 1,
                previousRank: day === 1 ? null : trackIndex + 1,
                rankChange: 0,
                rankTrend: day === 1 ? "new" : "same",
            };
        });

        for (let trackIndex = 0; trackIndex < tracks.length; trackIndex += 1) {
            const stat = trackRankings[trackIndex];
            await ensureById(TrackDailyStat, seedObjectId(12, day * 10 + trackIndex + 1), {
                trackId: stat.trackId,
                dateKey: dayKey,
                date: dayDate,
                playCount: stat.playCount,
                uniqueListeners: stat.uniqueListeners,
                averageListenDuration: stat.averageListenDuration,
                skipCount: stat.skipCount,
            });
            dailyTrackStats += 1;
        }

        const artistRankings = artists.map((artist, artistIndex) => {
            const artistTracks = trackRankings.slice(artistIndex * 2, artistIndex * 2 + 2);
            const playCount = artistTracks.reduce((sum, item) => sum + item.playCount, 0);
            return {
                artistId: artist._id,
                playCount,
                uniqueListeners: Math.round(playCount * 0.67),
                completedPlayCount: Math.round(playCount * 0.9),
                totalTracksPlayed: 2,
                score: playCount * 1.25,
                rank: artistIndex + 1,
            };
        });

        for (let artistIndex = 0; artistIndex < artists.length; artistIndex += 1) {
            await ensureById(ArtistDailyStat, seedObjectId(13, day * 10 + artistIndex + 1), {
                artistId: artists[artistIndex]._id,
                dateKey: dayKey,
                date: dayDate,
                streamCount: artistRankings[artistIndex].playCount,
                uniqueListeners: artistRankings[artistIndex].uniqueListeners,
            });
            dailyArtistStats += 1;
        }

        const existingTrackRanking = await TrackDailyRanking.findOne({ dateKey }).lean();
        if (!existingTrackRanking) {
            await TrackDailyRanking.create({
                _id: seedObjectId(14, day),
                dateKey: dayKey,
                date: dayDate,
                rankings: trackRankings,
            });
            dailyTrackRankings += 1;
        }

        const existingArtistRanking = await ArtistRanking.findOne({
            periodType: "daily",
            dateKey: dayKey,
        }).lean();
        if (!existingArtistRanking) {
            await ArtistRanking.create({
                _id: seedObjectId(15, day),
                periodType: "daily",
                dateKey: dayKey,
                date: dayDate,
                rankings: artistRankings,
            });
            dailyArtistRankings += 1;
        }
    }

    const monthlyTrackRankings = tracks.map((track, index) => ({
        trackId: track._id,
        playCount: 42000 - index * 3200,
        uniqueListeners: 25000 - index * 1500,
        rank: index + 1,
    }));
    const monthlyArtistRankings = artists.map((artist, index) => ({
        artistId: artist._id,
        playCount: 76000 - index * 12000,
        uniqueListeners: 44000 - index * 6000,
        completedPlayCount: 68000 - index * 10000,
        totalTracksPlayed: 2,
        score: 95000 - index * 14000,
        rank: index + 1,
    }));

    const existingMonthlyTrackRanking = await TrackMonthlyRanking.findOne({
        year: RANKING_YEAR,
        month: RANKING_MONTH,
    }).lean();
    if (!existingMonthlyTrackRanking) {
        await TrackMonthlyRanking.create({
            _id: seedObjectId(16, 1),
            year: RANKING_YEAR,
            month: RANKING_MONTH,
            rankings: monthlyTrackRankings,
        });
    }

    const existingMonthlyArtistRanking = await ArtistRanking.findOne({
        periodType: "monthly",
        year: RANKING_YEAR,
        month: RANKING_MONTH,
    }).lean();
    if (!existingMonthlyArtistRanking) {
        await ArtistRanking.create({
            _id: seedObjectId(17, 1),
            periodType: "monthly",
            year: RANKING_YEAR,
            month: RANKING_MONTH,
            rankings: monthlyArtistRankings,
        });
    }

    return {
        dailyTrackStats,
        dailyArtistStats,
        dailyTrackRankings,
        dailyArtistRankings,
        monthlyTrackRankingCreated: !existingMonthlyTrackRanking,
        monthlyArtistRankingCreated: !existingMonthlyArtistRanking,
    };
};

const clearDemoRankingCaches = async () => {
    if (!process.env.REDIS_URL) {
        return;
    }

    const redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on("error", () => {});

    try {
        await redisClient.connect();
        const patterns = [
            "top_tracks:daily:2026-08-*",
            "top_artists:daily:2026-08-*",
            "top_tracks:monthly:2026-07:*",
            "top_tracks:monthly:2026-08:*",
            "top_artists:monthly:2026-08:*",
        ];
        let deleted = 0;

        for (const pattern of patterns) {
            const keys = [];
            for await (const key of redisClient.scanIterator({ MATCH: pattern })) {
                keys.push(key);
            }

            if (keys.length > 0) {
                deleted += await redisClient.del(keys);
            }
        }

        console.log(`Ranking cache keys cleared: ${deleted}`);
    } catch (error) {
        console.warn("Ranking cache cleanup skipped:", error.message);
    } finally {
        if (redisClient.isOpen) {
            await redisClient.quit();
        }
    }
};

const seedDemo = async () => {
    const users = await buildUsers();
    const artists = await buildArtists(users);
    const albums = await buildAlbums(artists);
    const tracks = await buildTracks(artists, albums);
    const podcasts = await buildPodcasts(artists);
    const revenuePeriods = await buildRevenuePeriods();
    const monthlyStats = await buildMonthlyStats({ artists, tracks, podcasts });
    const historicalListenEvents = await buildHistoricalListenEvents({ artists, tracks, podcasts });
    const rankings = await buildAugustRankings({ artists, tracks });
    await clearDemoRankingCaches();

    console.log("Demo seed completed successfully.");
    console.log(`Users: ${users.length}`);
    console.log(`Artists: ${artists.length}`);
    console.log(`Albums / tracks / podcasts: ${albums.length} / ${tracks.length} / ${podcasts.length}`);
    console.log(`Open revenue periods: ${revenuePeriods.length} (06/2025 - 08/2026)`);
    console.log("Monthly stats:", monthlyStats);
    console.log(`Historical listen events: ${historicalListenEvents}`);
    console.log("August ranking data:", rankings);
    console.log(`Demo artist password: ${SEED_PASSWORD}`);
};

await connectMongoose();

try {
    await seedDemo();
} catch (error) {
    console.error("Demo seed failed:", error);
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}
