import mongoose from "mongoose";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import Track from "../../models/Track.js";
import TrackDailyRanking from "../../models/TrackDailyRanking.js";
import TrackMonthlyRanking from "../../models/TrackMonthlyRanking.js";
import redisClient from "../../config/redisConfig.js";
import { AppError } from "../../utils/AppError.js";
import {
    formatTrackDetail,
    formatTrackPlayback,
    formatTrackItem,
    getPremiumAccessState,
    getValidAudioFiles,
} from "./track.helper.js";
import { getAnalyticsTimezone } from "../analytics/trackStatAggregation.service.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const TOP_TRACKS_TODAY_TTL_SECONDS = 5 * 60;
const TOP_TRACKS_PAST_TTL_SECONDS = 24 * 60 * 60;
const TOP_TRACKS_CURRENT_MONTH_TTL_SECONDS = 15 * 60;
const TOP_TRACKS_PAST_MONTH_TTL_SECONDS = 24 * 60 * 60;

const getTrackIdentity = (track) => {
    if (!track) {
        return null;
    }

    return track.id || track._id || null;
};

const getValidTrackIds = async (trackIds) => {
    if (trackIds.length === 0) {
        return new Set();
    }

    const validTracks = await Track.find({
        _id: { $in: trackIds },
        activeStatus: "active",
        approvalStatus: "approved",
    })
        .select("_id")
        .lean();

    return new Set(validTracks.map((track) => track._id.toString()));
};

const normalizeTopTracks = async (topTracks, limit) => {
    const normalizedTracks = Array.isArray(topTracks) ? topTracks : [];
    const trackIds = normalizedTracks
        .map((item) => getTrackIdentity(item?.track))
        .filter(Boolean);
    const validTrackIds = await getValidTrackIds(trackIds);

    return normalizedTracks
        .filter((item) => {
            const trackId = getTrackIdentity(item?.track);
            return trackId && validTrackIds.has(String(trackId));
        })
        .slice(0, limit)
        .map((item, index) => {
            const nextRank = index + 1;
            const previousRank = item.previousRank ?? null;

            if (!previousRank) {
                return {
                    ...item,
                    rank: nextRank,
                    previousRank: null,
                    rankChange: 0,
                    rankTrend: "new",
                };
            }

            const rankChange = previousRank - nextRank;

            return {
                ...item,
                rank: nextRank,
                previousRank,
                rankChange,
                rankTrend:
                    rankChange > 0
                        ? "up"
                        : rankChange < 0
                            ? "down"
                            : "same",
            };
        });
};

const parseDailyTopTracksDate = (dateInput) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateInput);
    if (!match) {
        throw new AppError("Date is invalid.", 400, {
            field: "date",
        });
    }

    const [, yearStr, monthStr, dayStr] = match;
    const analyticsTimezone = getAnalyticsTimezone();
    const normalizedDateKey = `${yearStr}-${monthStr}-${dayStr}`;
    const startDay = dayjs
        .tz(`${normalizedDateKey}T00:00:00`, analyticsTimezone)
        .startOf("day");

    if (!startDay.isValid() || startDay.format("YYYY-MM-DD") !== normalizedDateKey) {
        throw new AppError("Date is invalid.", 400, {
            field: "date",
        });
    }

    const endDate = startDay.add(1, "day");

    return {
        startDate: startDay.toDate(),
        endDate: endDate.toDate(),
        dateKey: startDay.format("YYYY-MM-DD"),
    };
};

const buildDailyDateQuery = ({ dateKey, startDate, endDate }) => ({
    $or: [
        { dateKey },
        {
            date: {
                $gte: startDate,
                $lt: endDate,
            },
        },
    ],
});

const buildDailyTopTracksCacheKey = ({ dateKey, limit }) =>
    `top_tracks:daily:${dateKey}:limit:${limit}`;

const buildMonthlyTopTracksCacheKey = ({ monthKey, limit }) =>
    `top_tracks:monthly:${monthKey}:limit:${limit}`;

const getDailyTopTracksCacheTtl = (dateKey) => {
    const analyticsTimezone = getAnalyticsTimezone();
    const todayKey = dayjs().tz(analyticsTimezone).format("YYYY-MM-DD");

    return dateKey === todayKey
        ? TOP_TRACKS_TODAY_TTL_SECONDS
        : TOP_TRACKS_PAST_TTL_SECONDS;
};

const getMonthlyTopTracksCacheTtl = (monthKey) => {
    const analyticsTimezone = getAnalyticsTimezone();
    const currentMonthKey = dayjs().tz(analyticsTimezone).format("YYYY-MM");

    return monthKey === currentMonthKey
        ? TOP_TRACKS_CURRENT_MONTH_TTL_SECONDS
        : TOP_TRACKS_PAST_MONTH_TTL_SECONDS;
};

const formatDailyTopTrackStat = ({ stat, date }) => ({
    track: formatTrackItem(stat.trackId),
    date,
    rank: stat.rank,
    previousRank: stat.previousRank ?? null,
    rankChange: stat.rankChange ?? 0,
    rankTrend: stat.rankTrend || "new",
    playCount: stat.playCount,
    uniqueListeners: stat.uniqueListeners,
    averageListenDuration: stat.averageListenDuration,
    skipCount: stat.skipCount,
});

const parseMonthlyTopTracksMonth = (monthInput) => {
    const match = /^(\d{4})-(\d{2})$/.exec(monthInput);
    if (!match) {
        throw new AppError("Month is invalid.", 400, {
            field: "month",
        });
    }

    const [, yearStr, monthStr] = match;
    const analyticsTimezone = getAnalyticsTimezone();
    const normalizedMonthKey = `${yearStr}-${monthStr}`;
    const startMonth = dayjs
        .tz(`${normalizedMonthKey}-01T00:00:00`, analyticsTimezone)
        .startOf("month");

    if (!startMonth.isValid() || startMonth.format("YYYY-MM") !== normalizedMonthKey) {
        throw new AppError("Month is invalid.", 400, {
            field: "month",
        });
    }

    return {
        year: startMonth.year(),
        month: startMonth.month() + 1,
        monthKey: startMonth.format("YYYY-MM"),
    };
};

const formatMonthlyTopTrackStat = ({ stat, monthKey }) => ({
    track: formatTrackDetail(stat.trackId),
    month: monthKey,
    rank: stat.rank,
    playCount: stat.playCount,
    uniqueListeners: stat.uniqueListeners,
});

const getTrackDetail = async (trackId) => {
    if (!mongoose.Types.ObjectId.isValid(trackId)) {
        throw new AppError("Track id is invalid.", 400, {
            field: "id",
        });
    }

    const track = await Track.findOne({
        _id: trackId,
        activeStatus: "active",
        approvalStatus: "approved",
    })
        .populate({
            path: "artist_artistId",
            select: "name avatar coverImage",
        })
        .populate({
            path: "album_albumId",
            select: "title coverImage",
        })
        .populate({
            path: "genreIds",
            select: "name image",
        })
        .lean()
        .select("-__v -createdAt -updatedAt -blockedReason -hiddenReason -hiddenAt");

    if (!track) {
        throw new AppError("Track not found.", 404);
    }

    return formatTrackDetail(track);
};

const getTrackPlayback = async (trackId, user) => {
    if (!mongoose.Types.ObjectId.isValid(trackId)) {
        throw new AppError("Track id is invalid.", 400, {
            field: "id",
        });
    }

    const track = await Track.findOne({
        _id: trackId,
        activeStatus: "active",
        approvalStatus: "approved",
    })
        .populate({
            path: "artist_artistId",
            select: "name avatar coverImage",
        })
        .populate({
            path: "album_albumId",
            select: "title coverImage",
        })
        .lean()
        .select("-__v -createdAt -updatedAt");

    if (!track) {
        throw new AppError("Track not found.", 404);
    }

    const validAudioFiles = getValidAudioFiles(track.audioFiles);
    if (!validAudioFiles.length) {
        throw new AppError("Track does not have any audio file.", 404);
    }

    const accessState = await getPremiumAccessState(user);

    return formatTrackPlayback(track, validAudioFiles, accessState);
};

const getDailyTopTracks = async ({ date, limit }) => {
    const { startDate, endDate, dateKey } = parseDailyTopTracksDate(date);
    const cacheKey = buildDailyTopTracksCacheKey({ dateKey, limit });

    if (redisClient.isOpen) {
        try {
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                const parsedTopTracks = JSON.parse(cachedData);
                const topTracks = await normalizeTopTracks(parsedTopTracks, limit);

                if (topTracks.length === limit || parsedTopTracks.length < limit) {
                    return {
                        topTracks,
                        meta: {
                            date: dateKey,
                            limit,
                            cacheKey,
                            cacheHit: true,
                        },
                    };
                }
            }
        } catch (error) {
            console.error("Failed to read daily top tracks from Redis:", error);
        }
    }

    const rankingDocument = await TrackDailyRanking.findOne(
        buildDailyDateQuery({ dateKey, startDate, endDate })
    )
        .populate({
            path: "rankings.trackId",
            match: {
                activeStatus: "active",
                approvalStatus: "approved",
            },
            select: "_id title duration avatar stats activeStatus approvalStatus artist_artistId",
            populate: {
                path: "artist_artistId",
                select: "_id name avatar",
            },
        })
        .lean();

    const rankings = Array.isArray(rankingDocument?.rankings)
        ? rankingDocument.rankings
        : [];

    const topTracks = rankings
        .filter((stat) => Boolean(stat.trackId))
        .map((stat) =>
            formatDailyTopTrackStat({
                stat,
                date: rankingDocument?.dateKey || dateKey,
            })
        );
    const normalizedTopTracks = await normalizeTopTracks(topTracks, limit);

    if (redisClient.isOpen) {
        try {
            const ttl = getDailyTopTracksCacheTtl(dateKey);
            await redisClient.setEx(cacheKey, ttl, JSON.stringify(normalizedTopTracks));
        } catch (error) {
            console.error("Failed to cache daily top tracks in Redis:", error);
        }
    }

    return {
        topTracks: normalizedTopTracks,
        meta: {
            date: dateKey,
            limit,
            cacheKey,
            cacheHit: false,
        },
    };
};

const getMonthlyTopTracks = async ({ month, limit }) => {
    const { year, month: monthNumber, monthKey } = parseMonthlyTopTracksMonth(month);
    const cacheKey = buildMonthlyTopTracksCacheKey({ monthKey, limit });

    if (redisClient.isOpen) {
        try {
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                const parsedTopTracks = JSON.parse(cachedData);
                const topTracks = await normalizeTopTracks(parsedTopTracks, limit);

                if (topTracks.length === limit || parsedTopTracks.length < limit) {
                    return {
                        topTracks,
                        meta: {
                            month: monthKey,
                            limit,
                            cacheKey,
                            cacheHit: true,
                        },
                    };
                }
            }
        } catch (error) {
            console.error("Failed to read monthly top tracks from Redis:", error);
        }
    }

    const rankingDocument = await TrackMonthlyRanking.findOne({
        year,
        month: monthNumber,
    })
        .populate({
            path: "rankings.trackId",
            match: {
                activeStatus: "active",
                approvalStatus: "approved",
            },
            populate: [
                {
                    path: "artist_artistId",
                    select: "name avatar coverImage",
                },
                {
                    path: "album_albumId",
                    select: "title coverImage",
                },
                {
                    path: "genreIds",
                    select: "name image",
                },
            ],
        })
        .lean();

    const rankings = Array.isArray(rankingDocument?.rankings)
        ? rankingDocument.rankings
        : [];

    const topTracks = rankings
        .filter((stat) => Boolean(stat.trackId))
        .map((stat) =>
            formatMonthlyTopTrackStat({
                stat,
                monthKey,
            })
        );
    const normalizedTopTracks = await normalizeTopTracks(topTracks, limit);

    if (redisClient.isOpen) {
        try {
            const ttl = getMonthlyTopTracksCacheTtl(monthKey);
            await redisClient.setEx(cacheKey, ttl, JSON.stringify(normalizedTopTracks));
        } catch (error) {
            console.error("Failed to cache monthly top tracks in Redis:", error);
        }
    }

    return {
        topTracks: normalizedTopTracks,
        meta: {
            month: monthKey,
            limit,
            cacheKey,
            cacheHit: false,
        },
    };
};

export default {
    getTrackDetail,
    getTrackPlayback,
    getDailyTopTracks,
    getMonthlyTopTracks,
};
