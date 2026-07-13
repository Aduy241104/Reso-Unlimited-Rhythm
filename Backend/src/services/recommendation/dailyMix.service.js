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

            if (usedInMix.has(trackId)) {
                continue;
            }

            usedInMix.add(trackId);
            selected.push(candidate);

            if (selected.length >= tracksPerMix) {
                break;
            }
        }

        if (selected.length < tracksPerMix) {
            for (const candidate of candidates) {
                const trackId = String(candidate.track._id);

                if (usedInMix.has(trackId)) {
                    continue;
                }

                usedInMix.add(trackId);
                selected.push(candidate);

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
    const topArtists = sortScoreEntries(tasteProfile.artistScores).slice(0, 12);
    const topGenres = sortScoreEntries(tasteProfile.genreScores).slice(0, 12);

    return Array.from({ length: DAILY_MIX_COUNT }, (_, index) => {
        const artistEntries = topArtists
            .filter((_, artistIndex) => artistIndex % DAILY_MIX_COUNT === index)
            .slice(0, 4);
        const genreEntries = topGenres
            .filter((_, genreIndex) => genreIndex % DAILY_MIX_COUNT === index)
            .slice(0, 4);
        const fallbackArtistEntries =
            artistEntries.length > 0 ? artistEntries : topArtists.slice(index, index + 3);
        const fallbackGenreEntries =
            genreEntries.length > 0 ? genreEntries : topGenres.slice(index, index + 3);

        return {
            title: `Daily Mix ${index + 1}`,
            description: "Based on your recent listening and favorites.",
            artistEntries: fallbackArtistEntries,
            genreEntries: fallbackGenreEntries,
            artistIdSet: new Set(fallbackArtistEntries.map(([artistId]) => artistId)),
            genreIdSet: new Set(fallbackGenreEntries.map(([genreId]) => genreId)),
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
    const sourceTracks = focusedTracks.length >= MIX_TRACK_SPLIT.familiar
        ? focusedTracks
        : tracks;

    const candidates = sourceTracks
        .filter((track) => !skippedTrackIdSet.has(String(track._id)))
        .map((track) => {
            const trackId = String(track._id);
            const artistId = track.artist_artistId?._id
                ? String(track.artist_artistId._id)
                : String(track.artist_artistId || "");
            const genreIds = (track.genreIds || []).map((genre) =>
                genre?._id ? String(genre._id) : String(genre)
            );
            const baseTrackScore = tasteProfile.trackScores?.[trackId] || 0;
            const artistScore = tasteProfile.artistScores?.[artistId] || 0;
            const genreScore = genreIds.reduce(
                (sum, genreId) => sum + (tasteProfile.genreScores?.[genreId] || 0),
                0
            );
            const keywordBoost = calculateKeywordBoost(
                track,
                tasteProfile.searchKeywords
            );
            const clusterBonus =
                (cluster.artistIdSet.has(artistId) ? 6 : 0) +
                genreIds.filter((genreId) => cluster.genreIdSet.has(genreId)).length * 3;
            const recentPenalty = recentlyPlayedTrackIdSet.has(trackId) ? 1.5 : 0;
            const score = roundScore(
                baseTrackScore * 1.6 +
                artistScore * 0.4 +
                genreScore * 0.25 +
                keywordBoost +
                clusterBonus -
                recentPenalty
            );

            return {
                track,
                score,
                reason: getFamiliarReason(tasteProfile, trackId),
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
            const artistId = track.artist_artistId?._id
                ? String(track.artist_artistId._id)
                : String(track.artist_artistId || "");
            const genreIds = (track.genreIds || []).map((genre) =>
                genre?._id ? String(genre._id) : String(genre)
            );
            const artistScore = tasteProfile.artistScores?.[artistId] || 0;
            const genreScore = genreIds.reduce(
                (sum, genreId) => sum + (tasteProfile.genreScores?.[genreId] || 0),
                0
            );
            const keywordBoost = calculateKeywordBoost(
                track,
                tasteProfile.searchKeywords
            );
            const popularityBoost = Math.min(
                12,
                (track.stats?.totalPlay || 0) / 1000
            );
            const score = roundScore(
                artistScore * 1.2 +
                genreScore +
                keywordBoost +
                popularityBoost +
                (cluster.artistIdSet.has(artistId) ? 5 : 0) +
                genreIds.filter((genreId) => cluster.genreIdSet.has(genreId)).length * 4
            );

            return {
                track,
                score,
                reason: followedArtistIdSet.has(artistId)
                    ? "followed_artist"
                    : cluster.artistIdSet.has(artistId)
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
    fallbackCandidates,
    cluster,
}) => {
    const matchedCandidates = fallbackCandidates.filter((candidate) =>
        trackMatchesCluster(candidate.track, cluster)
    );
    const sourceCandidates =
        matchedCandidates.length >= MIX_TRACK_SPLIT.trending
            ? matchedCandidates
            : fallbackCandidates;

    return sourceCandidates
        .map((candidate) => {
            const artistId = candidate.track.artist_artistId?._id
                ? String(candidate.track.artist_artistId._id)
                : String(candidate.track.artist_artistId || "");
            const genreIds = (candidate.track.genreIds || []).map((genre) =>
                genre?._id ? String(genre._id) : String(genre)
            );
            const clusterScore =
                (cluster.artistIdSet.has(artistId) ? 4 : 0) +
                genreIds.filter((genreId) => cluster.genreIdSet.has(genreId)).length * 2;

            return {
                ...candidate,
                score: roundScore(candidate.score + clusterScore),
                reason:
                    candidate.reason === "trending_match" &&
                    (cluster.artistIdSet.has(artistId) ||
                        genreIds.some((genreId) => cluster.genreIdSet.has(genreId)))
                        ? "trending_match"
                        : candidate.reason,
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
    allowGlobalReuse = false,
}) => {
    for (const candidate of pool) {
        const trackId = String(candidate.track._id);

        if (selectedTrackIdSet.has(trackId)) {
            continue;
        }

        if (!allowGlobalReuse && globallyUsedTrackIdSet.has(trackId)) {
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
        score: roundScore(candidate.score),
        reason: candidate.reason,
    })),
});

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
            fallbackCandidates,
            cluster,
        });
        const selectedCandidates = [];
        const selectedTrackIdSet = new Set();

        pushCandidatesIntoSelection({
            pool: familiarCandidates,
            targetSize: MIX_TRACK_SPLIT.familiar,
            selected: selectedCandidates,
            selectedTrackIdSet,
            globallyUsedTrackIdSet,
        });
        pushCandidatesIntoSelection({
            pool: similarCandidates,
            targetSize: MIX_TRACK_SPLIT.familiar + MIX_TRACK_SPLIT.similar,
            selected: selectedCandidates,
            selectedTrackIdSet,
            globallyUsedTrackIdSet,
        });
        pushCandidatesIntoSelection({
            pool: trendingCandidates,
            targetSize: TRACKS_PER_MIX,
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

        if (selectedCandidates.length < TRACKS_PER_MIX) {
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
                allowGlobalReuse: true,
            });
        }

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
            const fallbackBlueprints = await buildFallbackMixBlueprints({
                tasteProfile,
                dateContext,
            });

            if (blueprints.length === 0) {
                source = "fallback";
                blueprints = fallbackBlueprints;
            } else {
                const existingTitles = new Set(blueprints.map((blueprint) => blueprint.title));
                for (const fallbackBlueprint of fallbackBlueprints) {
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
            tracks: blueprint.tracks
                ? blueprint.tracks.slice(0, TRACKS_PER_MIX)
                : blueprint.candidates.slice(0, TRACKS_PER_MIX).map((candidate, trackIndex) => ({
                    trackId: candidate.track._id,
                    order: trackIndex,
                    score: roundScore(candidate.score),
                    reason: candidate.reason,
                })),
        }));

    await upsertDailyMixBlueprints({
        userId,
        dateContext,
        blueprints: normalizedBlueprints,
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
