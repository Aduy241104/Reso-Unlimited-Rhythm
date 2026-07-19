import mongoose from "mongoose";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import Genre from "../../models/Genre.js";
import Track from "../../models/Track.js";
import UserRecentListeningActivity from "../../models/userRecentListeningActivity.js";
import { getAnalyticsTimezone } from "../analytics/trackStatAggregation.service.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const RECENT_ACTIVITY_CHART_DAYS = 7;
const RECENT_ACTIVITY_LIST_LIMIT = 10;
const RECENT_ACTIVITY_TOP_LIMIT = 5;
const RECENT_ACTIVITY_TOP_GENRE_LIMIT = 5;
const UNCLASSIFIED_GENRE_LABEL = "Chua phan loai";
const OTHER_GENRE_LABEL = "Khac";

const normalizeId = (value) => {
    if (!value) {
        return "";
    }

    if (typeof value === "object") {
        if (value._id) {
            return String(value._id);
        }

        if (value.id) {
            return String(value.id);
        }
    }

    return String(value);
};

const sanitizeText = (value, fallback = "") =>
    typeof value === "string" && value.trim() ? value.trim() : fallback;

const resolveTrackImage = (track = {}) => {
    if (typeof track?.avatar === "string" && track.avatar.trim()) {
        return track.avatar.trim();
    }

    if (Array.isArray(track?.coverImage)) {
        const firstImage = track.coverImage.find(
            (image) => typeof image === "string" && image.trim()
        );

        if (firstImage) {
            return firstImage.trim();
        }
    }

    if (typeof track?.coverImage === "string" && track.coverImage.trim()) {
        return track.coverImage.trim();
    }

    return "";
};

const resolveTopTrackImage = (aggregateTrack = {}, track = {}) =>
    sanitizeText(track?.avatar) ||
    sanitizeText(aggregateTrack?.trackImage) ||
    resolveTrackImage(track);

const resolveMinutes = (seconds) =>
    Number(((Number(seconds) || 0) / 60).toFixed(1));

const buildChartPoint = (day, stat = null) => ({
    date: day.format("YYYY-MM-DD"),
    label: day.format("DD/MM"),
    listenCount: Number(stat?.listenCount || 0),
    listenedMinutes: resolveMinutes(stat?.totalListenedDuration || 0),
});

const buildComparisonMetric = (currentValue, previousValue) => {
    const current = Number(currentValue || 0);
    const previous = Number(previousValue || 0);
    const diff = Number((current - previous).toFixed(1));

    return {
        current,
        previous,
        diff,
        absoluteDiff: Number(Math.abs(diff).toFixed(1)),
        trend: diff > 0 ? "up" : diff < 0 ? "down" : "same",
    };
};

const buildRecentPeriod = () => {
    const analyticsTimezone = getAnalyticsTimezone();
    const today = dayjs().tz(analyticsTimezone).startOf("day");

    return {
        from: today.subtract(RECENT_ACTIVITY_CHART_DAYS - 1, "day"),
        to: today,
        timezone: analyticsTimezone,
    };
};

const aggregateDailyListeningStatsForUser = async ({
    userId,
    startDate,
    endDate,
    analyticsTimezone,
}) =>
    UserRecentListeningActivity.aggregate([
        {
            $match: {
                userId,
                listenedAt: {
                    $gte: startDate,
                    $lt: endDate,
                },
            },
        },
        {
            $group: {
                _id: {
                    $dateToString: {
                        format: "%Y-%m-%d",
                        date: "$listenedAt",
                        timezone: analyticsTimezone,
                    },
                },
                listenCount: { $sum: 1 },
                totalListenedDuration: {
                    $sum: { $ifNull: ["$listenedDuration", 0] },
                },
            },
        },
        { $sort: { _id: 1 } },
    ]);

const normalizeTopGenres = (genres = []) =>
    genres.map((genre) => ({
        id: normalizeId(genre?.genreId),
        name: sanitizeText(genre?.name, UNCLASSIFIED_GENRE_LABEL),
        listenCount: Number(genre?.listenCount || 0),
        trackCount: Number(genre?.trackCount || 0),
        percentage: Number(genre?.percentage || 0),
    }));

const normalizeTopTracks = (tracks = []) =>
    tracks.map((track) => ({
        id: normalizeId(track?.trackId),
        title: sanitizeText(track?.title, "Untitled track"),
        image: sanitizeText(track?.image),
        listenCount: Number(track?.listenCount || 0),
        listenedMinutes: Number(track?.listenedMinutes || 0),
        genres: (track?.genres || []).map((genre) => ({
            id: normalizeId(genre?.genreId),
            name: sanitizeText(genre?.name, UNCLASSIFIED_GENRE_LABEL),
        })),
    }));

export const storeRecentListeningActivity = async ({
    userId,
    track,
    artistId,
    albumId,
    listenedAt,
    listenedDuration,
    listenPercent,
    source,
}) => {
    const artist = track?.artist_artistId || null;
    const album = track?.album_albumId || null;

    return UserRecentListeningActivity.create({
        userId,
        trackId: normalizeId(track?._id || track?.id),
        artistId: normalizeId(artistId || artist?._id || artist?.id) || null,
        albumId: normalizeId(albumId || album?._id || album?.id) || null,
        trackTitle: sanitizeText(track?.title, "Untitled track"),
        trackImage: resolveTrackImage(track),
        artistName: sanitizeText(artist?.name, "Unknown artist"),
        artistAvatar: sanitizeText(artist?.avatar),
        albumTitle: sanitizeText(album?.title),
        albumCoverImage: sanitizeText(album?.coverImage),
        trackDuration: Number(track?.duration) || 0,
        listenedDuration: Number(listenedDuration) || 0,
        listenPercent: Number.isFinite(Number(listenPercent))
            ? Number(listenPercent)
            : null,
        listenedAt: listenedAt || new Date(),
        source: sanitizeText(source, "unknown"),
    });
};

export const buildRecentListeningInsightsPayloadForUser = async (userId) => {
    const period = buildRecentPeriod();
    const normalizedUserId = new mongoose.Types.ObjectId(String(userId));
    const startDate = period.from.toDate();
    const endDate = period.to.add(1, "day").toDate();

    const groupedTrackStats = await UserRecentListeningActivity.aggregate([
        {
            $match: {
                userId: normalizedUserId,
                listenedAt: {
                    $gte: startDate,
                    $lt: endDate,
                },
            },
        },
        {
            $sort: {
                listenedAt: -1,
                _id: -1,
            },
        },
        {
            $group: {
                _id: "$trackId",
                listenCount: { $sum: 1 },
                totalListenedDuration: {
                    $sum: { $ifNull: ["$listenedDuration", 0] },
                },
                latestListenedAt: { $max: "$listenedAt" },
                trackTitle: { $first: "$trackTitle" },
                trackImage: { $first: "$trackImage" },
            },
        },
    ]);

    const groupedTrackIds = groupedTrackStats.map((item) => item._id).filter(Boolean);
    const listenedTracks =
        groupedTrackIds.length > 0
            ? await Track.find({ _id: { $in: groupedTrackIds } })
                .select("_id title avatar coverImage genreIds")
                .lean()
            : [];

    const trackById = new Map(
        listenedTracks.map((track) => [String(track._id), track])
    );

    const listenedGenreIds = [
        ...new Set(
            listenedTracks.flatMap((track) =>
                Array.isArray(track?.genreIds)
                    ? track.genreIds.map((genreId) => String(genreId))
                    : []
            )
        ),
    ];

    const genres =
        listenedGenreIds.length > 0
            ? await Genre.find({ _id: { $in: listenedGenreIds } })
                .select("_id name")
                .lean()
            : [];

    const genreById = new Map(
        genres.map((genre) => [String(genre._id), genre])
    );

    const topTracks = groupedTrackStats
        .map((item) => {
            const trackId = normalizeId(item?._id);
            const matchedTrack = trackById.get(trackId);
            const genreItems = Array.isArray(matchedTrack?.genreIds)
                ? matchedTrack.genreIds
                    .map((genreId) => genreById.get(String(genreId)))
                    .filter(Boolean)
                    .map((genre) => ({
                        genreId: genre?._id || null,
                        name: sanitizeText(genre?.name, UNCLASSIFIED_GENRE_LABEL),
                    }))
                : [];

            return {
                trackId: item?._id || null,
                title: sanitizeText(
                    matchedTrack?.title || item?.trackTitle,
                    "Untitled track"
                ),
                image: resolveTopTrackImage(item, matchedTrack),
                listenCount: Number(item?.listenCount || 0),
                listenedMinutes: resolveMinutes(item?.totalListenedDuration || 0),
                genres: genreItems,
                latestListenedAt: item?.latestListenedAt || null,
            };
        })
        .filter((item) => item.listenCount > 0)
        .sort((left, right) => {
            if (right.listenCount !== left.listenCount) {
                return right.listenCount - left.listenCount;
            }

            return (
                new Date(right.latestListenedAt || 0).getTime() -
                new Date(left.latestListenedAt || 0).getTime()
            );
        })
        .slice(0, RECENT_ACTIVITY_TOP_LIMIT)
        .map(({ latestListenedAt, ...track }) => track);

    const genreTotalsMap = new Map();
    const otherGenreTotals = {
        listenCount: 0,
        trackIds: new Set(),
    };

    groupedTrackStats.forEach((item) => {
        const trackId = normalizeId(item?._id);
        const listenCount = Number(item?.listenCount || 0);
        const matchedTrack = trackById.get(trackId);
        const genreIds = Array.isArray(matchedTrack?.genreIds)
            ? [...new Set(matchedTrack.genreIds.map((genreId) => String(genreId)))]
            : [];

        if (genreIds.length === 0) {
            otherGenreTotals.listenCount += listenCount;
            otherGenreTotals.trackIds.add(trackId);
            return;
        }

        const weightedListenCount = listenCount / genreIds.length;

        genreIds.forEach((genreId) => {
            const currentTotals = genreTotalsMap.get(genreId) || {
                listenCount: 0,
                trackIds: new Set(),
            };

            currentTotals.listenCount += weightedListenCount;
            currentTotals.trackIds.add(trackId);
            genreTotalsMap.set(genreId, currentTotals);
        });
    });

    const rankedGenres = [...genreTotalsMap.entries()]
        .map(([genreId, item]) => {
            const genre = genreById.get(genreId);

            return {
                genreId: genre?._id || null,
                name: sanitizeText(genre?.name, UNCLASSIFIED_GENRE_LABEL),
                listenCount: Number(item.listenCount || 0),
                trackCount: item.trackIds.size,
                trackIds: item.trackIds,
            };
        })
        .filter((item) => item.listenCount > 0)
        .sort((left, right) => {
            if (right.listenCount !== left.listenCount) {
                return right.listenCount - left.listenCount;
            }

            return right.trackCount - left.trackCount;
        });

    const topRankedGenres = rankedGenres.slice(0, RECENT_ACTIVITY_TOP_GENRE_LIMIT);
    const remainingGenres = rankedGenres.slice(RECENT_ACTIVITY_TOP_GENRE_LIMIT);

    if (remainingGenres.length > 0) {
        remainingGenres.forEach((genre) => {
            otherGenreTotals.listenCount += Number(genre.listenCount || 0);
            genre.trackIds.forEach((trackId) => otherGenreTotals.trackIds.add(trackId));
        });
    }

    const topGenrePayload = topRankedGenres.map(({ trackIds, ...genre }) => genre);

    if (otherGenreTotals.listenCount > 0) {
        topGenrePayload.push({
            genreId: null,
            name: OTHER_GENRE_LABEL,
            listenCount: Number(otherGenreTotals.listenCount || 0),
            trackCount: otherGenreTotals.trackIds.size,
        });
    }

    const totalGenreListens = topGenrePayload.reduce(
        (sum, item) => sum + Number(item.listenCount || 0),
        0
    );

    const topGenres = topGenrePayload.map((genre) => ({
        ...genre,
        percentage: totalGenreListens
            ? Number(
                (
                    (Number(genre.listenCount || 0) / totalGenreListens) *
                    100
                ).toFixed(2)
            )
            : 0,
    }));

    return {
        userId: normalizedUserId,
        range: {
            from: period.from.format("YYYY-MM-DD"),
            to: period.to.format("YYYY-MM-DD"),
        },
        topGenres,
        topTracks,
        lastCalculatedAt: new Date(),
    };
};

export const getRecentListeningInsightsByUserId = async (
    userId,
    { allowLiveFallback = true } = {}
) => {
    const period = buildRecentPeriod();

    if (!allowLiveFallback) {
        return {
            range: {
                from: period.from.format("YYYY-MM-DD"),
                to: period.to.format("YYYY-MM-DD"),
            },
            topGenres: [],
            topTracks: [],
            lastCalculatedAt: null,
        };
    }

    const liveInsights = await buildRecentListeningInsightsPayloadForUser(userId);

    return {
        range: liveInsights.range,
        topGenres: normalizeTopGenres(liveInsights.topGenres || []),
        topTracks: normalizeTopTracks(liveInsights.topTracks || []),
        lastCalculatedAt: liveInsights.lastCalculatedAt || null,
    };
};

export const getRecentListeningActivityByUserId = async (userId) => {
    const analyticsTimezone = getAnalyticsTimezone();
    const today = dayjs().tz(analyticsTimezone).startOf("day");
    const startDay = today.subtract(RECENT_ACTIVITY_CHART_DAYS - 1, "day");
    const endDay = today.add(1, "day");
    const normalizedUserId = new mongoose.Types.ObjectId(String(userId));

    const [dailyStats, recentItems, liveInsights] = await Promise.all([
        aggregateDailyListeningStatsForUser({
            userId: normalizedUserId,
            startDate: startDay.toDate(),
            endDate: endDay.toDate(),
            analyticsTimezone,
        }),
        UserRecentListeningActivity.find({ userId: normalizedUserId })
            .sort({ listenedAt: -1 })
            .limit(RECENT_ACTIVITY_LIST_LIMIT)
            .lean(),
        buildRecentListeningInsightsPayloadForUser(userId),
    ]);

    const statByDate = new Map(dailyStats.map((stat) => [stat._id, stat]));

    const chart = Array.from({ length: RECENT_ACTIVITY_CHART_DAYS }, (_, index) => {
        const day = startDay.add(index, "day");
        const dateKey = day.format("YYYY-MM-DD");

        return buildChartPoint(day, statByDate.get(dateKey));
    });

    const totalListens = chart.reduce(
        (sum, item) => sum + Number(item.listenCount || 0),
        0
    );
    const totalMinutes = Number(
        chart
            .reduce((sum, item) => sum + Number(item.listenedMinutes || 0), 0)
            .toFixed(1)
    );
    const activeDays = chart.filter((item) => item.listenCount > 0).length;

    const yesterday = today.subtract(1, "day");
    const liveTodaySummary = statByDate.get(today.format("YYYY-MM-DD")) || {
        listenCount: 0,
        totalListenedDuration: 0,
    };
    const liveYesterdaySummary = statByDate.get(yesterday.format("YYYY-MM-DD")) || {
        listenCount: 0,
        totalListenedDuration: 0,
    };

    const todayListenedMinutes = resolveMinutes(
        liveTodaySummary.totalListenedDuration || 0
    );
    const yesterdayListenedMinutes = resolveMinutes(
        liveYesterdaySummary.totalListenedDuration || 0
    );

    return {
        timezone: analyticsTimezone,
        range: {
            days: RECENT_ACTIVITY_CHART_DAYS,
            from: startDay.format("YYYY-MM-DD"),
            to: today.format("YYYY-MM-DD"),
        },
        summary: {
            totalListens,
            totalMinutes,
            activeDays,
            latestTrackTitle: sanitizeText(
                recentItems[0]?.trackTitle,
                "No recent track"
            ),
            today: {
                listenCount: Number(liveTodaySummary.listenCount || 0),
                listenedMinutes: todayListenedMinutes,
            },
            yesterday: {
                listenCount: Number(liveYesterdaySummary.listenCount || 0),
                listenedMinutes: yesterdayListenedMinutes,
            },
            comparison: {
                listenCount: buildComparisonMetric(
                    liveTodaySummary.listenCount,
                    liveYesterdaySummary.listenCount
                ),
                listenedMinutes: buildComparisonMetric(
                    todayListenedMinutes,
                    yesterdayListenedMinutes
                ),
            },
        },
        chart,
        topGenres: normalizeTopGenres(liveInsights.topGenres || []),
        topTracks: normalizeTopTracks(liveInsights.topTracks || []),
        recentTracks: recentItems.map((item) => ({
            id: normalizeId(item?._id),
            listenedAt: item?.listenedAt || null,
            listenedDuration: Number(item?.listenedDuration || 0),
            listenedMinutes: resolveMinutes(item?.listenedDuration || 0),
            source: sanitizeText(item?.source, "unknown"),
            track: {
                id: normalizeId(item?.trackId),
                title: sanitizeText(item?.trackTitle, "Untitled track"),
                image: sanitizeText(item?.trackImage),
                duration: Number(item?.trackDuration || 0),
            },
            artist: {
                id: normalizeId(item?.artistId),
                name: sanitizeText(item?.artistName, "Unknown artist"),
                avatar: sanitizeText(item?.artistAvatar),
            },
            album: {
                id: normalizeId(item?.albumId),
                title: sanitizeText(item?.albumTitle),
                coverImage: sanitizeText(item?.albumCoverImage),
            },
        })),
    };
};

export default {
    buildRecentListeningInsightsPayloadForUser,
    getRecentListeningActivityByUserId,
    getRecentListeningInsightsByUserId,
    storeRecentListeningActivity,
};
