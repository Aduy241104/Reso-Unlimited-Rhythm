import mongoose from "mongoose";
import ListenEvent from "../../models/ListenEvent.js";
import PersonalizedMix from "../../models/PersonalizedMix.js";
import Track from "../../models/Track.js";
import TrackDailyRanking from "../../models/TrackDailyRanking.js";
import TrackDailyStat from "../../models/TrackDailyStat.js";
import TrackMonthlyRanking from "../../models/TrackMonthlyRanking.js";
import { AppError } from "../../utils/AppError.js";
import {
    deleteDailyMixCache,
    getDailyMixCache,
    setDailyMixCache,
} from "./recommendationCache.service.js";
import {
    ACTIVE_USER_WINDOW_DAYS,
    ALGORITHM_VERSION,
    DAILY_MIX_COUNT,
    MIX_TRACK_SPLIT,
    TRACKS_PER_MIX,
    SCORE_RULES,
    calculateKeywordBoost,
    getRecommendationDateContext,
    getWindowStartDate,
    roundScore,
    sortScoreEntries,
    buildTasteProfile,
} from "./tasteProfile.service.js";

const TRACK_POPULATE = [
    {
        path: "artist_artistId",
        select: "name avatar activeStatus",
        match: { activeStatus: "active" },
    },
    {
        path: "genreIds",
        select: "name",
    },
];

const ensureValidUserId = (userId) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new AppError("User id is invalid.", 400, {
            field: "userId",
        });
    }
};

const fetchValidTracksByIds = async (trackIds) => {
    if (!Array.isArray(trackIds) || trackIds.length === 0) {
        return [];
    }

    const tracks = await Track.find({
        _id: { $in: trackIds },
        activeStatus: "active",
        approvalStatus: "approved",
    })
        .select(
            "_id title duration avatar coverImage artist_artistId genreIds stats releaseDate"
        )
        .populate(TRACK_POPULATE)
        .lean();

    return tracks.filter((track) => Boolean(track.artist_artistId));
};

const getLatestDailyRankingDocument = async (dateKey) =>
    TrackDailyRanking.findOne({
        $or: [
            { dateKey },
            { date: { $lte: new Date() } },
        ],
    })
        .sort({ date: -1, createdAt: -1 })
        .lean()
        .select("dateKey rankings");

const getLatestMonthlyRankingDocument = async (monthKey) => {
    const [year, month] = monthKey.split("-").map(Number);

    return TrackMonthlyRanking.findOne({
        $or: [
            { year, month },
            { year: { $lte: year } },
        ],
    })
        .sort({ year: -1, month: -1, createdAt: -1 })
        .lean()
        .select("year month rankings");
};

const getLatestDailyStatDocuments = async (dateKey) => {
    const exactStats = await TrackDailyStat.find({ dateKey })
        .sort({ playCount: -1, uniqueListeners: -1 })
        .limit(100)
        .lean()
        .select("trackId playCount uniqueListeners averageListenDuration skipCount");

    if (exactStats.length > 0) {
        return exactStats;
    }

    const latestStat = await TrackDailyStat.findOne({})
        .sort({ date: -1, createdAt: -1 })
        .lean()
        .select("dateKey");

    if (!latestStat?.dateKey) {
        return [];
    }

    return TrackDailyStat.find({ dateKey: latestStat.dateKey })
        .sort({ playCount: -1, uniqueListeners: -1 })
        .limit(100)
        .lean()
        .select("trackId playCount uniqueListeners averageListenDuration skipCount");
};

const buildTasteMatchScore = (track, tasteProfile) => {
    const trackId = String(track._id);
    const artistId = track.artist_artistId?._id
        ? String(track.artist_artistId._id)
        : String(track.artist_artistId || "");
    const genreIds = (track.genreIds || []).map((genre) =>
        genre?._id ? String(genre._id) : String(genre)
    );

    let score = 0;
    score += (tasteProfile.trackScores?.[trackId] || 0) * 1.2;
    score += tasteProfile.artistScores?.[artistId] || 0;
    score += genreIds.reduce(
        (sum, genreId) => sum + (tasteProfile.genreScores?.[genreId] || 0),
        0
    );
    score += calculateKeywordBoost(track, tasteProfile.searchKeywords) * 0.5;

    return roundScore(score);
};

const buildRankingSignals = ({
    dailyRankingDocument,
    monthlyRankingDocument,
    dailyStatDocuments,
}) => {
    const dailyRankMap = new Map(
        (dailyRankingDocument?.rankings || [])
            .filter((entry) => entry?.trackId && Number.isInteger(entry?.rank))
            .map((entry) => [
                String(entry.trackId),
                {
                    rank: entry.rank,
                    playCount: entry.playCount || 0,
                    uniqueListeners: entry.uniqueListeners || 0,
                    averageListenDuration: entry.averageListenDuration || 0,
                    skipCount: entry.skipCount || 0,
                },
            ])
    );
    const monthlyRankMap = new Map(
        (monthlyRankingDocument?.rankings || [])
            .filter((entry) => entry?.trackId && Number.isInteger(entry?.rank))
            .map((entry) => [
                String(entry.trackId),
                {
                    rank: entry.rank,
                    playCount: entry.playCount || 0,
                    uniqueListeners: entry.uniqueListeners || 0,
                },
            ])
    );
    const dailyStatMap = new Map(
        (dailyStatDocuments || [])
            .filter((entry) => entry?.trackId)
            .map((entry) => [
                String(entry.trackId),
                {
                    playCount: entry.playCount || 0,
                    uniqueListeners: entry.uniqueListeners || 0,
                    averageListenDuration: entry.averageListenDuration || 0,
                    skipCount: entry.skipCount || 0,
                },
            ])
    );

    return {
        dailyRankMap,
        monthlyRankMap,
        dailyStatMap,
    };
};

const buildTrendingScore = (trackId, rankingSignals) => {
    const dailySignal = rankingSignals.dailyRankMap.get(trackId);
    const monthlySignal = rankingSignals.monthlyRankMap.get(trackId);
    const statSignal = rankingSignals.dailyStatMap.get(trackId);

    let score = 0;

    if (dailySignal?.rank) {
        score += Math.max(0, 120 - dailySignal.rank);
    }

    if (monthlySignal?.rank) {
        score += Math.max(0, 80 - monthlySignal.rank);
    }

    if (statSignal?.playCount) {
        score += Math.min(40, statSignal.playCount / 5);
    }

    if (statSignal?.uniqueListeners) {
        score += Math.min(20, statSignal.uniqueListeners / 3);
    }

    if (statSignal?.skipCount) {
        score -= Math.min(15, statSignal.skipCount);
    }

    return roundScore(score);
};

const BEHAVIORAL_MIX_DEFINITIONS = [
    {
        title: "Daily Mix 1",
        description:
            "Replay-heavy picks built from the tracks you finish and revisit most.",
        focus: "repeat_favorites",
        artistSources: ["recentArtists", "topArtists"],
        genreSources: ["recentGenres", "topGenres"],
        targetSplit: {
            familiar: 12,
            similar: 5,
            trending: 3,
        },
        weights: {
            track: 1.45,
            artist: 0.4,
            genre: 0.2,
            completion: 10,
            repeat: 4.5,
            liked: 5,
            playlist: 3,
            search: 1.5,
            followedAlbum: 1.5,
            followedArtist: 2,
            keyword: 0.4,
            clusterArtist: 5,
            clusterGenre: 2,
            popularity: 0.15,
            freshness: 0.2,
            recencyPenalty: 2.2,
            skipPenalty: 6,
            trendingBase: 0.55,
        },
    },
    {
        title: "Daily Mix 2",
        description:
            "Tracks with strong completion patterns and low skip behavior.",
        focus: "completion_flow",
        artistSources: ["topArtists", "recentArtists"],
        genreSources: ["topGenres", "recentGenres"],
        targetSplit: {
            familiar: 10,
            similar: 6,
            trending: 4,
        },
        weights: {
            track: 1.25,
            artist: 0.45,
            genre: 0.25,
            completion: 12,
            repeat: 2.5,
            liked: 3.5,
            playlist: 2,
            search: 1,
            followedAlbum: 1.5,
            followedArtist: 2,
            keyword: 0.35,
            clusterArtist: 4,
            clusterGenre: 3,
            popularity: 0.2,
            freshness: 0.3,
            recencyPenalty: 1.8,
            skipPenalty: 7,
            trendingBase: 0.65,
        },
    },
    {
        title: "Daily Mix 3",
        description:
            "Comfort picks expanded from what you save into your own playlists.",
        focus: "playlist_comfort",
        artistSources: ["topArtists", "recentArtists"],
        genreSources: ["recentGenres", "topGenres"],
        targetSplit: {
            familiar: 9,
            similar: 7,
            trending: 4,
        },
        weights: {
            track: 1.2,
            artist: 0.5,
            genre: 0.3,
            completion: 8,
            repeat: 2.5,
            liked: 4,
            playlist: 5,
            search: 1,
            followedAlbum: 2,
            followedArtist: 2,
            keyword: 0.4,
            clusterArtist: 4,
            clusterGenre: 3.5,
            popularity: 0.15,
            freshness: 0.25,
            recencyPenalty: 1.5,
            skipPenalty: 5,
            trendingBase: 0.55,
        },
    },
    {
        title: "Daily Mix 4",
        description:
            "Artist-led selections weighted by who you follow and return to often.",
        focus: "artist_loyalty",
        artistSources: ["followedArtists", "topArtists", "recentArtists"],
        genreSources: ["topGenres", "recentGenres"],
        targetSplit: {
            familiar: 8,
            similar: 8,
            trending: 4,
        },
        weights: {
            track: 1.1,
            artist: 0.75,
            genre: 0.2,
            completion: 7,
            repeat: 2,
            liked: 3,
            playlist: 2.5,
            search: 1,
            followedAlbum: 1.5,
            followedArtist: 5.5,
            keyword: 0.3,
            clusterArtist: 7,
            clusterGenre: 2,
            popularity: 0.2,
            freshness: 0.3,
            recencyPenalty: 1.2,
            skipPenalty: 5,
            trendingBase: 0.6,
        },
    },
    {
        title: "Daily Mix 5",
        description:
            "Genre rotations shaped by the moods and styles dominating your recent plays.",
        focus: "genre_rotation",
        artistSources: ["recentArtists", "topArtists"],
        genreSources: ["recentGenres", "topGenres"],
        targetSplit: {
            familiar: 8,
            similar: 7,
            trending: 5,
        },
        weights: {
            track: 1.05,
            artist: 0.35,
            genre: 0.55,
            completion: 6.5,
            repeat: 1.8,
            liked: 2.5,
            playlist: 2.5,
            search: 1.3,
            followedAlbum: 1.5,
            followedArtist: 1.5,
            keyword: 0.45,
            clusterArtist: 3,
            clusterGenre: 5.5,
            popularity: 0.2,
            freshness: 0.35,
            recencyPenalty: 1.1,
            skipPenalty: 5,
            trendingBase: 0.7,
        },
    },
    {
        title: "Daily Mix 6",
        description:
            "Discovery picks tuned by search intent, favorites, and current trending overlap.",
        focus: "discovery_intent",
        artistSources: ["recentArtists", "followedArtists", "topArtists"],
        genreSources: ["recentGenres", "topGenres"],
        targetSplit: {
            familiar: 6,
            similar: 8,
            trending: 6,
        },
        weights: {
            track: 0.95,
            artist: 0.4,
            genre: 0.35,
            completion: 5.5,
            repeat: 1.5,
            liked: 2.5,
            playlist: 2,
            search: 3.5,
            followedAlbum: 1.5,
            followedArtist: 2,
            keyword: 0.8,
            clusterArtist: 3,
            clusterGenre: 4,
            popularity: 0.35,
            freshness: 0.45,
            recencyPenalty: 0.8,
            skipPenalty: 4.5,
            trendingBase: 0.95,
        },
    },
];

const rotateEntries = (entries, offset = 0, limit = 4) => {
    if (!Array.isArray(entries) || entries.length === 0) {
        return [];
    }

    const normalizedOffset = offset % entries.length;
    return [...entries.slice(normalizedOffset), ...entries.slice(0, normalizedOffset)].slice(
        0,
        limit
    );
};

const mergeUniqueEntries = (...groups) => {
    const merged = [];
    const usedIds = new Set();

    for (const group of groups) {
        for (const entry of group || []) {
            if (!entry?.[0] || usedIds.has(entry[0])) {
                continue;
            }

            usedIds.add(entry[0]);
            merged.push(entry);
        }
    }

    return merged;
};

const getTrackPreferenceContext = (track, tasteProfile, cluster) => {
    const trackId = String(track._id);
    const artistId = track.artist_artistId?._id
        ? String(track.artist_artistId._id)
        : String(track.artist_artistId || "");
    const genreIds = (track.genreIds || []).map((genre) =>
        genre?._id ? String(genre._id) : String(genre)
    );
    const behaviorMetrics = tasteProfile.trackBehaviorMetrics?.[trackId] || {};
    const trackReason = tasteProfile.trackReasons?.[trackId] || {};
    const playCount = behaviorMetrics.playCount || 0;
    const completionRate = playCount
        ? (behaviorMetrics.completedCount || 0) / playCount
        : 0;
    const skipRate = playCount ? (behaviorMetrics.skippedCount || 0) / playCount : 0;
    const repeatCount = behaviorMetrics.repeatCount || 0;
    const keywordBoost = calculateKeywordBoost(track, tasteProfile.searchKeywords);
    const popularityBoost = Math.min(18, (track.stats?.totalPlay || 0) / 1000);
    const releaseAgeInDays = track.releaseDate
        ? Math.max(
            0,
            Math.floor(
                (Date.now() - new Date(track.releaseDate).getTime()) / (24 * 60 * 60 * 1000)
            )
        )
        : null;
    const freshnessBoost =
        releaseAgeInDays === null ? 0 : Math.max(0, 45 - releaseAgeInDays) / 15;
    const recentIndex = (tasteProfile.recentlyPlayedTrackIds || []).indexOf(trackId);
    const recentPenalty =
        recentIndex === -1 ? 0 : Math.max(0.25, 1 - recentIndex / 50);
    const matchedGenreCount = genreIds.filter((genreId) =>
        cluster.genreIdSet.has(genreId)
    ).length;
    const clusterArtistMatch = cluster.artistIdSet.has(artistId) ? 1 : 0;
    const clusterGenreMatch = matchedGenreCount;

    return {
        trackId,
        artistId,
        genreIds,
        playCount,
        completionRate,
        skipRate,
        repeatCount,
        keywordBoost,
        popularityBoost,
        freshnessBoost,
        recentPenalty,
        clusterArtistMatch,
        clusterGenreMatch,
        trackReason,
        followedArtistMatch: (tasteProfile.followedArtistIds || []).includes(artistId),
    };
};

const resolveCandidateReason = (context) => {
    if (context.trackReason?.liked) {
        return "liked_track";
    }

    if (context.trackReason?.inPlaylist) {
        return "user_playlist";
    }

    if (context.followedArtistMatch) {
        return "followed_artist";
    }

    if (context.clusterArtistMatch > 0) {
        return "same_artist";
    }

    if (context.trackReason?.frequentListen) {
        return "frequent_listen";
    }

    if (context.clusterGenreMatch > 0 || context.trackReason?.searchClick) {
        return "same_genre";
    }

    return "fallback_trending";
};

const scoreCandidateForCluster = ({
    track,
    tasteProfile,
    cluster,
    sourceType,
    baseScore = 0,
}) => {
    const context = getTrackPreferenceContext(track, tasteProfile, cluster);
    const weights = cluster.weights || {};
    const trackScore = tasteProfile.trackScores?.[context.trackId] || 0;
    const artistScore = tasteProfile.artistScores?.[context.artistId] || 0;
    const genreScore = context.genreIds.reduce(
        (sum, genreId) => sum + (tasteProfile.genreScores?.[genreId] || 0),
        0
    );
    const affinityScore =
        trackScore * (weights.track || 1) +
        artistScore * (weights.artist || 0) +
        genreScore * (weights.genre || 0);
    const behaviorScore =
        context.completionRate * (weights.completion || 0) +
        Math.min(4, context.repeatCount) * (weights.repeat || 0) +
        (context.trackReason?.liked ? weights.liked || 0 : 0) +
        (context.trackReason?.inPlaylist ? weights.playlist || 0 : 0) +
        (context.trackReason?.searchClick ? weights.search || 0 : 0) +
        (context.trackReason?.followedAlbum ? weights.followedAlbum || 0 : 0) +
        (context.followedArtistMatch ? weights.followedArtist || 0 : 0);
    const clusterMatchScore =
        context.clusterArtistMatch * (weights.clusterArtist || 0) +
        context.clusterGenreMatch * (weights.clusterGenre || 0);
    const discoveryScore =
        context.keywordBoost * (weights.keyword || 0) +
        context.popularityBoost * (weights.popularity || 0) +
        context.freshnessBoost * (weights.freshness || 0);
    const penaltyScore =
        context.recentPenalty * (weights.recencyPenalty || 0) +
        context.skipRate * (weights.skipPenalty || 0);
    const sourceBoostByType = {
        familiar: 1.1,
        similar: 1,
        trending: weights.trendingBase || 0.8,
    };

    return {
        context,
        score: roundScore(
            baseScore * (sourceBoostByType[sourceType] || 1) +
                affinityScore +
                behaviorScore +
                clusterMatchScore +
                discoveryScore -
                penaltyScore
        ),
        reason: resolveCandidateReason(context),
    };
};

const getClusterTargetSplit = (cluster) => cluster.targetSplit || MIX_TRACK_SPLIT;

const getFallbackCandidates = async ({
    tasteProfile,
    dateContext,
    excludeTrackIds = [],
    limit = DAILY_MIX_COUNT * TRACKS_PER_MIX * 3,
}) => {
    const monthKey = String(dateContext.dateKey).slice(0, 7);
    const [dailyRankingDocument, monthlyRankingDocument, dailyStatDocuments] =
        await Promise.all([
            getLatestDailyRankingDocument(dateContext.dateKey),
            getLatestMonthlyRankingDocument(monthKey),
            getLatestDailyStatDocuments(dateContext.dateKey),
        ]);

    const rankingSignals = buildRankingSignals({
        dailyRankingDocument,
        monthlyRankingDocument,
        dailyStatDocuments,
    });

    const candidateTrackIds = [
        ...(dailyRankingDocument?.rankings || []).map((entry) => String(entry.trackId)),
        ...(monthlyRankingDocument?.rankings || []).map((entry) => String(entry.trackId)),
        ...(dailyStatDocuments || []).map((entry) => String(entry.trackId)),
    ];
    const excludedSet = new Set(excludeTrackIds.map((id) => String(id)));
    const tracks = await fetchValidTracksByIds([...new Set(candidateTrackIds)]);

    const candidates = tracks
        .filter((track) => !excludedSet.has(String(track._id)))
        .map((track) => {
            const trackId = String(track._id);
            const tasteScore = buildTasteMatchScore(track, tasteProfile);
            const trendingScore = buildTrendingScore(trackId, rankingSignals);
            const keywordBoost = calculateKeywordBoost(
                track,
                tasteProfile.searchKeywords
            );
            const totalScore = roundScore(
                tasteScore * 1.1 + trendingScore + keywordBoost
            );

            return {
                track,
                score: totalScore,
                reason:
                    tasteScore > SCORE_RULES.searchKeywordOnly
                        ? "trending_match"
                        : "fallback_trending",
            };
        })
        .sort((left, right) => {
            if (right.score !== left.score) {
                return right.score - left.score;
            }

            return String(left.track._id).localeCompare(String(right.track._id));
        })
        .slice(0, limit);

    console.log(
        `[Recommendation] Fallback candidates prepared: ${candidates.length}.`
    );

    return candidates;
};

const buildFallbackBasedOn = (tasteProfile, fallbackTracks) => {
    const topGenres = sortScoreEntries(tasteProfile.genreScores)
        .slice(0, 3)
        .map(([genreId, score]) => ({
            genreId,
            name: tasteProfile.genreNames?.[genreId] || "",
            score: roundScore(score),
        }));
    const topArtists = sortScoreEntries(tasteProfile.artistScores)
        .slice(0, 3)
        .map(([artistId, score]) => ({
            artistId,
            name: tasteProfile.artistNames?.[artistId] || "",
            score: roundScore(score),
        }));

    if (topGenres.length > 0 || topArtists.length > 0) {
        return {
            genres: topGenres,
            artists: topArtists,
        };
    }

    const genreAccumulator = new Map();
    const artistAccumulator = new Map();

    for (const candidate of fallbackTracks) {
        const artistId = candidate.track.artist_artistId?._id
            ? String(candidate.track.artist_artistId._id)
            : null;
        const artistName = candidate.track.artist_artistId?.name || "";

        if (artistId) {
            const nextValue = (artistAccumulator.get(artistId)?.score || 0) + candidate.score;
            artistAccumulator.set(artistId, {
                artistId,
                name: artistName,
                score: nextValue,
            });
        }

        for (const genre of candidate.track.genreIds || []) {
            if (!genre?._id) {
                continue;
            }

            const genreId = String(genre._id);
            const nextValue = (genreAccumulator.get(genreId)?.score || 0) + candidate.score;
            genreAccumulator.set(genreId, {
                genreId,
                name: genre.name || "",
                score: nextValue,
            });
        }
    }

    return {
        genres: [...genreAccumulator.values()]
            .sort((left, right) => right.score - left.score)
            .slice(0, 3)
            .map((entry) => ({
                ...entry,
                score: roundScore(entry.score),
            })),
        artists: [...artistAccumulator.values()]
            .sort((left, right) => right.score - left.score)
            .slice(0, 3)
            .map((entry) => ({
                ...entry,
                score: roundScore(entry.score),
            })),
    };
};

const buildFallbackMixBlueprints = async ({
    tasteProfile,
    dateContext,
    mixCount = DAILY_MIX_COUNT,
    tracksPerMix = TRACKS_PER_MIX,
    reservedTrackIds = [],
}) => {
    const candidates = await getFallbackCandidates({
        tasteProfile,
        dateContext,
        limit: mixCount * tracksPerMix * 2,
    });

    if (candidates.length === 0) {
        return [];
    }

    const blueprints = [];
    const globallyUsedTrackIdSet = new Set(
        reservedTrackIds.map((trackId) => String(trackId))
    );
    const fallbackBasedOn = buildFallbackBasedOn(
        tasteProfile,
        candidates.slice(0, tracksPerMix)
    );

    for (let mixIndex = 0; mixIndex < mixCount; mixIndex += 1) {
        const offset = mixIndex * tracksPerMix;
        const selected = [];
        const usedInMix = new Set();

        for (let cursor = offset; cursor < candidates.length; cursor += 1) {
            const candidate = candidates[cursor];
            const trackId = String(candidate.track._id);

            if (usedInMix.has(trackId) || globallyUsedTrackIdSet.has(trackId)) {
                continue;
            }

            usedInMix.add(trackId);
            selected.push(candidate);
            globallyUsedTrackIdSet.add(trackId);

            if (selected.length >= tracksPerMix) {
                break;
            }
        }

        if (selected.length < tracksPerMix) {
            for (const candidate of candidates) {
                const trackId = String(candidate.track._id);

                if (usedInMix.has(trackId) || globallyUsedTrackIdSet.has(trackId)) {
                    continue;
                }

                usedInMix.add(trackId);
                selected.push(candidate);
                globallyUsedTrackIdSet.add(trackId);

                if (selected.length >= tracksPerMix) {
                    break;
                }
            }
        }

        blueprints.push({
            title: `Daily Mix ${mixIndex + 1}`,
            description: "Trending picks tailored to what you may enjoy today.",
            basedOn: fallbackBasedOn,
            candidates: selected.slice(0, tracksPerMix),
        });
    }

    return blueprints;
};

const formatMixDocument = (mixDocument) => ({
    _id: mixDocument._id,
    title: mixDocument.title,
    description: mixDocument.description || "",
    mixType: mixDocument.mixType,
    basedOn: {
        genres: (mixDocument.basedOn?.genres || []).map((genre) => ({
            genreId: genre.genreId,
            name: genre.name || "",
            score: roundScore(genre.score || 0),
        })),
        artists: (mixDocument.basedOn?.artists || []).map((artist) => ({
            artistId: artist.artistId,
            name: artist.name || "",
            score: roundScore(artist.score || 0),
        })),
    },
    tracks: (mixDocument.tracks || [])
        .sort((left, right) => left.order - right.order)
        .filter(
            (entry) => entry?.trackId && entry.trackId?.artist_artistId
        )
        .map((entry) => ({
            _id: entry.trackId._id,
            title: entry.trackId.title,
            duration: entry.trackId.duration || 0,
            avatar: entry.trackId.avatar || "",
            coverImage: entry.trackId.coverImage || [],
            artist: {
                _id: entry.trackId.artist_artistId._id,
                name: entry.trackId.artist_artistId.name || "",
                avatar: entry.trackId.artist_artistId.avatar || "",
            },
            score: roundScore(entry.score || 0),
            reason: entry.reason,
        })),
    generatedAt: mixDocument.generatedAt,
    expiresAt: mixDocument.expiresAt,
});

const loadStoredDailyMixes = async (userId, dateKey) => {
    const mixDocuments = await PersonalizedMix.find({
        userId,
        dateKey,
        mixType: "daily_mix",
    })
        .sort({ title: 1, _id: 1 })
        .populate({
            path: "tracks.trackId",
            match: {
                activeStatus: "active",
                approvalStatus: "approved",
            },
            select:
                "_id title duration avatar coverImage artist_artistId genreIds activeStatus approvalStatus",
            populate: TRACK_POPULATE,
        })
        .lean();

    if (mixDocuments.length > 0) {
        console.log(
            `[Recommendation] DB hit for user ${userId} at date ${dateKey}: ${mixDocuments.length} mix(es).`
        );
    } else {
        console.log(`[Recommendation] DB miss for user ${userId} at date ${dateKey}.`);
    }

    return mixDocuments.map(formatMixDocument);
};

const hasExpectedMixCount = (mixes) => mixes.length === DAILY_MIX_COUNT;

const hasCompleteStoredMixes = (mixes) =>
    hasExpectedMixCount(mixes) &&
    mixes.every((mix) => Array.isArray(mix.tracks) && mix.tracks.length >= TRACKS_PER_MIX);

const trackMatchesCluster = (track, cluster) => {
    const artistId = track.artist_artistId?._id
        ? String(track.artist_artistId._id)
        : String(track.artist_artistId || "");
    const genreIds = (track.genreIds || []).map((genre) =>
        genre?._id ? String(genre._id) : String(genre)
    );

    const hasArtistPreference = cluster.artistIdSet.size > 0;
    const hasGenrePreference = cluster.genreIdSet.size > 0;

    if (!hasArtistPreference && !hasGenrePreference) {
        return true;
    }

    if (hasArtistPreference && cluster.artistIdSet.has(artistId)) {
        return true;
    }

    return genreIds.some((genreId) => cluster.genreIdSet.has(genreId));
};

const buildMixClusters = (tasteProfile) => {
    const topArtists = sortScoreEntries(tasteProfile.artistScores).slice(0, 24);
    const topGenres = sortScoreEntries(tasteProfile.genreScores).slice(0, 24);
    const recentArtists = (tasteProfile.recentArtistIds || []).map((artistId) => [
        artistId,
        roundScore((tasteProfile.artistScores?.[artistId] || 0) + 4),
    ]);
    const recentGenres = (tasteProfile.recentGenreIds || []).map((genreId) => [
        genreId,
        roundScore((tasteProfile.genreScores?.[genreId] || 0) + 3),
    ]);
    const followedArtists = (tasteProfile.followedArtistIds || []).map((artistId) => [
        artistId,
        roundScore((tasteProfile.artistScores?.[artistId] || 0) + 5),
    ]);
    const sourceEntries = {
        topArtists,
        topGenres,
        recentArtists,
        recentGenres,
        followedArtists,
    };

    return BEHAVIORAL_MIX_DEFINITIONS.map((definition, index) => {
        const artistEntries = mergeUniqueEntries(
            ...(definition.artistSources || []).map((sourceKey) =>
                rotateEntries(sourceEntries[sourceKey] || [], index, 4)
            ),
            rotateEntries(topArtists, index * 2, 4)
        ).slice(0, 4);
        const genreEntries = mergeUniqueEntries(
            ...(definition.genreSources || []).map((sourceKey) =>
                rotateEntries(sourceEntries[sourceKey] || [], index, 4)
            ),
            rotateEntries(topGenres, index * 2, 4)
        ).slice(0, 4);

        return {
            title: definition.title,
            description: definition.description,
            focus: definition.focus,
            targetSplit: definition.targetSplit,
            weights: definition.weights,
            artistEntries,
            genreEntries,
            artistIdSet: new Set(artistEntries.map(([artistId]) => artistId)),
            genreIdSet: new Set(genreEntries.map(([genreId]) => genreId)),
        };
    });
};

const buildBasedOn = (cluster, tasteProfile) => ({
    genres: cluster.genreEntries.slice(0, 3).map(([genreId, score]) => ({
        genreId,
        name: tasteProfile.genreNames?.[genreId] || "",
        score: roundScore(score),
    })),
    artists: cluster.artistEntries.slice(0, 3).map(([artistId, score]) => ({
        artistId,
        name: tasteProfile.artistNames?.[artistId] || "",
        score: roundScore(score),
    })),
});

const getFamiliarReason = (tasteProfile, trackId) => {
    const trackReason = tasteProfile.trackReasons?.[trackId];

    if (trackReason?.liked) {
        return "liked_track";
    }

    if (trackReason?.inPlaylist) {
        return "user_playlist";
    }

    return "frequent_listen";
};

const buildFamiliarCandidates = async ({
    tasteProfile,
    cluster,
}) => {
    const topTrackIds = sortScoreEntries(tasteProfile.trackScores)
        .slice(0, 120)
        .map(([trackId]) => trackId);
    const skippedTrackIdSet = new Set(tasteProfile.skippedTrackIds || []);
    const recentlyPlayedTrackIdSet = new Set(tasteProfile.recentlyPlayedTrackIds || []);
    const tracks = await fetchValidTracksByIds(topTrackIds);
    const focusedTracks = tracks.filter((track) => trackMatchesCluster(track, cluster));
    const sourceTracks = focusedTracks.length >= getClusterTargetSplit(cluster).familiar
        ? focusedTracks
        : tracks;

    const candidates = sourceTracks
        .filter((track) => !skippedTrackIdSet.has(String(track._id)))
        .map((track) => {
            const { context, score, reason } = scoreCandidateForCluster({
                track,
                tasteProfile,
                cluster,
                sourceType: "familiar",
            });

            return {
                track,
                score: roundScore(
                    score - (recentlyPlayedTrackIdSet.has(context.trackId) ? 0.75 : 0)
                ),
                reason:
                    reason === "fallback_trending"
                        ? getFamiliarReason(tasteProfile, context.trackId)
                        : reason,
            };
        })
        .sort((left, right) => {
            if (right.score !== left.score) {
                return right.score - left.score;
            }

            return String(left.track._id).localeCompare(String(right.track._id));
        });

    console.log(
        `[Recommendation] Familiar candidates for ${cluster.title}: ${candidates.length}.`
    );

    return candidates;
};

const buildSimilarCandidates = async ({
    tasteProfile,
    cluster,
}) => {
    const preferenceArtistIds = cluster.artistEntries.map(([artistId]) => artistId);
    const preferenceGenreIds = cluster.genreEntries.map(([genreId]) => genreId);

    if (preferenceArtistIds.length === 0 && preferenceGenreIds.length === 0) {
        return [];
    }

    const excludedTrackIds = [
        ...Object.keys(tasteProfile.trackScores || {}).slice(0, 200),
        ...(tasteProfile.skippedTrackIds || []),
    ];

    const tracks = await Track.find({
        _id: { $nin: excludedTrackIds },
        activeStatus: "active",
        approvalStatus: "approved",
        $or: [
            ...(preferenceArtistIds.length > 0
                ? [{ artist_artistId: { $in: preferenceArtistIds } }]
                : []),
            ...(preferenceGenreIds.length > 0
                ? [{ genreIds: { $in: preferenceGenreIds } }]
                : []),
        ],
    })
        .select(
            "_id title duration avatar coverImage artist_artistId genreIds stats releaseDate"
        )
        .sort({ "stats.totalPlay": -1, createdAt: -1 })
        .limit(160)
        .populate(TRACK_POPULATE)
        .lean();

    const followedArtistIdSet = new Set(tasteProfile.followedArtistIds || []);

    const candidates = tracks
        .filter((track) => Boolean(track.artist_artistId))
        .map((track) => {
            const { context, score } = scoreCandidateForCluster({
                track,
                tasteProfile,
                cluster,
                sourceType: "similar",
            });

            return {
                track,
                score,
                reason: followedArtistIdSet.has(context.artistId)
                    ? "followed_artist"
                    : cluster.artistIdSet.has(context.artistId)
                        ? "same_artist"
                        : "same_genre",
            };
        })
        .sort((left, right) => {
            if (right.score !== left.score) {
                return right.score - left.score;
            }

            return String(left.track._id).localeCompare(String(right.track._id));
        });

    console.log(
        `[Recommendation] Similar candidates for ${cluster.title}: ${candidates.length}.`
    );

    return candidates;
};

const buildTrendingCandidatesForCluster = ({
    tasteProfile,
    fallbackCandidates,
    cluster,
}) => {
    const matchedCandidates = fallbackCandidates.filter((candidate) =>
        trackMatchesCluster(candidate.track, cluster)
    );
    const sourceCandidates =
        matchedCandidates.length >= getClusterTargetSplit(cluster).trending
            ? matchedCandidates
            : fallbackCandidates;

    return sourceCandidates
        .map((candidate) => {
            const { context, score, reason } = scoreCandidateForCluster({
                track: candidate.track,
                tasteProfile,
                cluster,
                sourceType: "trending",
                baseScore: candidate.score,
            });

            return {
                track: candidate.track,
                score,
                reason:
                    candidate.reason === "trending_match" &&
                    (context.clusterArtistMatch > 0 || context.clusterGenreMatch > 0)
                        ? "trending_match"
                        : reason,
            };
        })
        .sort((left, right) => {
            if (right.score !== left.score) {
                return right.score - left.score;
            }

            return String(left.track._id).localeCompare(String(right.track._id));
        });
};

const pushCandidatesIntoSelection = ({
    pool,
    targetSize,
    selected,
    selectedTrackIdSet,
    globallyUsedTrackIdSet,
}) => {
    for (const candidate of pool) {
        const trackId = String(candidate.track._id);

        if (selectedTrackIdSet.has(trackId)) {
            continue;
        }

        if (globallyUsedTrackIdSet.has(trackId)) {
            continue;
        }

        selected.push(candidate);
        selectedTrackIdSet.add(trackId);

        if (selected.length >= targetSize) {
            break;
        }
    }
};

const buildPersistableMix = ({
    cluster,
    selectedCandidates,
    tasteProfile,
}) => ({
    title: cluster.title,
    description: cluster.description,
    basedOn: buildBasedOn(cluster, tasteProfile),
    tracks: selectedCandidates.slice(0, TRACKS_PER_MIX).map((candidate, index) => ({
        trackId: candidate.track._id,
        order: index,
        score: roundScore(Math.max(0, candidate.score || 0)),
        reason: candidate.reason || "fallback_trending",
    })),
});

const normalizeBlueprintTracks = (blueprint) => {
    if (Array.isArray(blueprint.tracks)) {
        return blueprint.tracks.map((track) => ({
            trackId: track.trackId,
            order: track.order,
            score: roundScore(Math.max(0, track.score || 0)),
            reason: track.reason || "fallback_trending",
        }));
    }

    return (blueprint.candidates || []).map((candidate, index) => ({
        trackId: candidate.track._id,
        order: index,
        score: roundScore(Math.max(0, candidate.score || 0)),
        reason: candidate.reason || "fallback_trending",
    }));
};

const ensureUniqueTracksAcrossBlueprints = (blueprints) => {
    const globallyUsedTrackIdSet = new Set();

    return blueprints.map((blueprint) => {
        const locallyUsedTrackIdSet = new Set();
        const dedupedTracks = normalizeBlueprintTracks(blueprint)
            .filter((track) => {
                const trackId = track?.trackId ? String(track.trackId) : "";

                if (
                    !trackId ||
                    locallyUsedTrackIdSet.has(trackId) ||
                    globallyUsedTrackIdSet.has(trackId)
                ) {
                    return false;
                }

                locallyUsedTrackIdSet.add(trackId);
                globallyUsedTrackIdSet.add(trackId);
                return true;
            })
            .slice(0, TRACKS_PER_MIX)
            .map((track, index) => ({
                ...track,
                order: index,
            }));

        return {
            ...blueprint,
            tracks: dedupedTracks,
        };
    });
};

const upsertDailyMixBlueprints = async ({
    userId,
    dateContext,
    blueprints,
}) => {
    const generatedAt = new Date();

    await Promise.all(
        blueprints.map((blueprint) =>
            PersonalizedMix.findOneAndUpdate(
                {
                    userId,
                    dateKey: dateContext.dateKey,
                    mixType: "daily_mix",
                    title: blueprint.title,
                },
                {
                    $set: {
                        userId,
                        dateKey: dateContext.dateKey,
                        date: dateContext.date,
                        mixType: "daily_mix",
                        title: blueprint.title,
                        description: blueprint.description,
                        basedOn: blueprint.basedOn,
                        tracks: blueprint.tracks,
                        algorithmVersion: ALGORITHM_VERSION,
                        generatedAt,
                        expiresAt: dateContext.expiresAt,
                    },
                },
                {
                    upsert: true,
                    new: true,
                    setDefaultsOnInsert: true,
                }
            )
        )
    );
};

const buildPersonalizedMixBlueprints = async ({
    tasteProfile,
    dateContext,
}) => {
    const clusters = buildMixClusters(tasteProfile);
    const globallyUsedTrackIdSet = new Set();
    const fallbackCandidates = await getFallbackCandidates({
        tasteProfile,
        dateContext,
        excludeTrackIds: tasteProfile.skippedTrackIds,
        limit: DAILY_MIX_COUNT * TRACKS_PER_MIX * 4,
    });
    const mixBlueprints = [];

    for (const cluster of clusters) {
        const targetSplit = getClusterTargetSplit(cluster);
        const [familiarCandidates, similarCandidates] = await Promise.all([
            buildFamiliarCandidates({
                tasteProfile,
                cluster,
            }),
            buildSimilarCandidates({
                tasteProfile,
                cluster,
            }),
        ]);
        const trendingCandidates = buildTrendingCandidatesForCluster({
            tasteProfile,
            fallbackCandidates,
            cluster,
        });
        const selectedCandidates = [];
        const selectedTrackIdSet = new Set();

        pushCandidatesIntoSelection({
            pool: familiarCandidates,
            targetSize: targetSplit.familiar,
            selected: selectedCandidates,
            selectedTrackIdSet,
            globallyUsedTrackIdSet,
        });
        pushCandidatesIntoSelection({
            pool: similarCandidates,
            targetSize: targetSplit.familiar + targetSplit.similar,
            selected: selectedCandidates,
            selectedTrackIdSet,
            globallyUsedTrackIdSet,
        });
        pushCandidatesIntoSelection({
            pool: trendingCandidates,
            targetSize:
                targetSplit.familiar + targetSplit.similar + targetSplit.trending,
            selected: selectedCandidates,
            selectedTrackIdSet,
            globallyUsedTrackIdSet,
        });
        pushCandidatesIntoSelection({
            pool: [
                ...familiarCandidates,
                ...similarCandidates,
                ...trendingCandidates,
            ],
            targetSize: TRACKS_PER_MIX,
            selected: selectedCandidates,
            selectedTrackIdSet,
            globallyUsedTrackIdSet,
        });

        if (selectedCandidates.length === 0) {
            continue;
        }

        for (const candidate of selectedCandidates) {
            globallyUsedTrackIdSet.add(String(candidate.track._id));
        }

        mixBlueprints.push(
            buildPersistableMix({
                cluster,
                selectedCandidates,
                tasteProfile,
            })
        );

        console.log(
            `[Recommendation] ${cluster.title} selected ${selectedCandidates.length} track(s).`
        );
    }

    return mixBlueprints;
};

const buildAndStoreDailyMixes = async (userId, dateContext) => {
    const tasteProfile = await buildTasteProfile(userId, dateContext);
    let source = "rebuilt";
    let blueprints = [];

    if (tasteProfile.isColdStart) {
        source = "fallback";
        blueprints = await buildFallbackMixBlueprints({
            tasteProfile,
            dateContext,
        });
    } else {
        blueprints = await buildPersonalizedMixBlueprints({
            tasteProfile,
            dateContext,
        });

        if (!hasExpectedMixCount(blueprints)) {
            if (blueprints.length === 0) {
                const fallbackBlueprints = await buildFallbackMixBlueprints({
                    tasteProfile,
                    dateContext,
                });
                source = "fallback";
                blueprints = fallbackBlueprints;
            } else {
                const reservedTrackIds = blueprints.flatMap((blueprint) =>
                    normalizeBlueprintTracks(blueprint).map((track) => track.trackId)
                );
                const uniqueFallbackBlueprints = await buildFallbackMixBlueprints({
                    tasteProfile,
                    dateContext,
                    reservedTrackIds,
                });
                const existingTitles = new Set(blueprints.map((blueprint) => blueprint.title));
                for (const fallbackBlueprint of uniqueFallbackBlueprints) {
                    if (!existingTitles.has(fallbackBlueprint.title)) {
                        blueprints.push({
                            title: fallbackBlueprint.title,
                            description: fallbackBlueprint.description,
                            basedOn: fallbackBlueprint.basedOn,
                            tracks: fallbackBlueprint.candidates.map((candidate, index) => ({
                                trackId: candidate.track._id,
                                order: index,
                                score: roundScore(candidate.score),
                                reason: candidate.reason,
                            })),
                        });
                    }
                }
            }
        }
    }

    if (blueprints.length === 0) {
        throw new AppError("Could not build daily mixes.", 500);
    }

    const normalizedBlueprints = blueprints
        .slice(0, DAILY_MIX_COUNT)
        .map((blueprint, index) => ({
            title: blueprint.title || `Daily Mix ${index + 1}`,
            description:
                blueprint.description ||
                "Based on your recent listening and favorites.",
            basedOn: blueprint.basedOn || { genres: [], artists: [] },
            tracks: normalizeBlueprintTracks(blueprint).slice(0, TRACKS_PER_MIX),
        }));
    const uniqueBlueprints = ensureUniqueTracksAcrossBlueprints(normalizedBlueprints);

    await upsertDailyMixBlueprints({
        userId,
        dateContext,
        blueprints: uniqueBlueprints,
    });

    const mixes = await loadStoredDailyMixes(userId, dateContext.dateKey);
    console.log(
        `[Recommendation] ${source === "fallback" ? "Fallback used" : "Rebuilt recommendation"} for user ${userId}.`
    );

    return {
        source,
        dateKey: dateContext.dateKey,
        mixes,
    };
};

export const getDailyMixesForUser = async (userId, options = {}) => {
    ensureValidUserId(userId);
    const dateContext = getRecommendationDateContext(options.targetDateInput);

    if (!options.forceRebuild) {
        const cachedPayload = await getDailyMixCache(userId, dateContext.dateKey);

        if (cachedPayload?.mixes?.length) {
            return {
                ...cachedPayload,
                source: "redis",
            };
        }

        const storedMixes = await loadStoredDailyMixes(userId, dateContext.dateKey);

        if (hasCompleteStoredMixes(storedMixes)) {
            const payload = {
                source: "database",
                dateKey: dateContext.dateKey,
                mixes: storedMixes,
            };

            await setDailyMixCache(userId, dateContext.dateKey, payload);
            return payload;
        }
    } else {
        await deleteDailyMixCache(userId, dateContext.dateKey);
    }

    const rebuiltPayload = await buildAndStoreDailyMixes(userId, dateContext);
    await setDailyMixCache(userId, dateContext.dateKey, rebuiltPayload);
    return rebuiltPayload;
};

export const rebuildDailyMixesForUser = async (userId, options = {}) =>
    getDailyMixesForUser(userId, {
        ...options,
        forceRebuild: true,
    });

export {
    buildMixClusters,
    ensureUniqueTracksAcrossBlueprints,
};

export const prebuildDailyMixesForActiveUsers = async (options = {}) => {
    const dateContext = getRecommendationDateContext(options.targetDateInput);
    const activeWindowStart = getWindowStartDate(
        dateContext,
        options.activeWindowDays || ACTIVE_USER_WINDOW_DAYS
    );
    const batchSize = Math.max(1, Number(options.batchSize) || 25);
    const activeUserIds = await ListenEvent.distinct("userId", {
        userId: { $exists: true, $ne: null },
        listenedAt: {
            $gte: activeWindowStart,
            $lt: dateContext.dayEnd,
        },
    });

    let successCount = 0;
    let failureCount = 0;

    for (let index = 0; index < activeUserIds.length; index += batchSize) {
        const batch = activeUserIds.slice(index, index + batchSize);
        const batchResults = await Promise.allSettled(
            batch.map((activeUserId) =>
                rebuildDailyMixesForUser(String(activeUserId), {
                    targetDateInput: options.targetDateInput,
                })
            )
        );

        for (const result of batchResults) {
            if (result.status === "fulfilled") {
                successCount += 1;
            } else {
                failureCount += 1;
                console.error("[Recommendation] Failed to prebuild daily mix:", result.reason);
            }
        }
    }

    return {
        dateKey: dateContext.dateKey,
        totalUsers: activeUserIds.length,
        successCount,
        failureCount,
        batchSize,
    };
};

export default {
    getDailyMixesForUser,
    prebuildDailyMixesForActiveUsers,
    rebuildDailyMixesForUser,
};
