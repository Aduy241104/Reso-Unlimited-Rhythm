import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { StatusCodes } from "http-status-codes";
import Artist from "../../models/Artist.js";
import ListenEvent from "../../models/ListenEvent.js";
import Track from "../../models/Track.js";
import { getAnalyticsTimezone } from "../analytics/trackStatAggregation.service.js";
import { AppError } from "../../utils/AppError.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const DATE_KEY_FORMAT = "YYYY-MM-DD";
const DEFAULT_RANGE = "30d";
const ALLOWED_RANGES = new Set(["7d", "30d", "all", "custom"]);

const roundToTwoDecimals = (value) => Number(Number(value || 0).toFixed(2));
const convertSecondsToMinutes = (value) => roundToTwoDecimals(Number(value || 0) / 60);

const isValidDateKey = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const parsed = dayjs.utc(`${value}T00:00:00Z`);
    return parsed.isValid() && parsed.format(DATE_KEY_FORMAT) === value;
};

const parseDateKey = (value) => dayjs.utc(`${value}T00:00:00Z`);

const getTodayInAnalyticsTimezone = () =>
    dayjs().tz(getAnalyticsTimezone()).startOf("day");

const ensureDateKey = (value) => {
    if (!isValidDateKey(value)) {
        throw new AppError("Invalid date range", StatusCodes.BAD_REQUEST);
    }

    return value;
};

const ensureDateRangeOrder = (from, to) => {
    if (parseDateKey(from).isAfter(parseDateKey(to))) {
        throw new AppError("Invalid date range", StatusCodes.BAD_REQUEST);
    }
};

const resolveArtistProfile = async (userId) => {
    const artist = await Artist.findOne({ userId }).select("_id").lean();

    if (!artist) {
        throw new AppError("Artist profile not found.", StatusCodes.NOT_FOUND);
    }

    return artist;
};

const resolveAllTimePeriod = async (artistId) => {
    const [result] = await ListenEvent.aggregate([
        {
            $match: {
                artistId,
                isValidStream: true,
                listenedAt: { $exists: true, $ne: null },
            },
        },
        {
            $group: {
                _id: null,
                earliestListenedAt: { $min: "$listenedAt" },
            },
        },
        {
            $project: {
                _id: 0,
                earliestListenedAt: 1,
            },
        },
    ]);

    const today = getTodayInAnalyticsTimezone();
    const fromDate = result?.earliestListenedAt
        ? dayjs(result.earliestListenedAt)
            .tz(getAnalyticsTimezone())
            .startOf("day")
        : today;

    return {
        from: fromDate.format(DATE_KEY_FORMAT),
        to: today.format(DATE_KEY_FORMAT),
        range: "all",
    };
};

const resolveOverviewPeriod = ({ range, from, to }) => {
    const normalizedRange = String(range || DEFAULT_RANGE).trim();

    if (!ALLOWED_RANGES.has(normalizedRange)) {
        throw new AppError("Invalid analytics range", StatusCodes.BAD_REQUEST);
    }

    if (normalizedRange === "all") {
        return {
            from: null,
            to: null,
            range: normalizedRange,
        };
    }

    if (normalizedRange === "custom") {
        if (!from || !to) {
            throw new AppError("Invalid date range", StatusCodes.BAD_REQUEST);
        }

        const normalizedFrom = ensureDateKey(String(from).trim());
        const normalizedTo = ensureDateKey(String(to).trim());

        ensureDateRangeOrder(normalizedFrom, normalizedTo);

        return {
            from: normalizedFrom,
            to: normalizedTo,
            range: normalizedRange,
        };
    }

    const today = getTodayInAnalyticsTimezone();
    const dayCount = Number.parseInt(normalizedRange.replace("d", ""), 10);
    const fromDate = today.subtract(dayCount - 1, "day");

    return {
        from: fromDate.format(DATE_KEY_FORMAT),
        to: today.format(DATE_KEY_FORMAT),
        range: normalizedRange,
    };
};

const buildTopTrackPayload = ({ track, stats, rank }) => ({
    rank,
    track: {
        id: String(track._id),
        title: track.title,
        avatar: track.avatar || "",
        coverImage: Array.isArray(track.coverImage) ? track.coverImage : [],
        duration: convertSecondsToMinutes(track.duration),
        activeStatus: track.activeStatus || "",
        approvalStatus: track.approvalStatus || "",
        stats: {
            totalPlay: Number(track?.stats?.totalPlay || 0),
        },
    },
    playCount: Number(stats?.playCount || 0),
    uniqueListeners: Number(stats?.uniqueListeners || 0),
    averageListenDuration: convertSecondsToMinutes(
        Number(stats?.averageListenDuration || 0)
    ),
    skipCount: Number(stats?.skipCount || 0),
    skipRate:
        Number(stats?.playCount || 0) > 0
            ? roundToTwoDecimals(
                (Number(stats?.skipCount || 0) / Number(stats?.playCount || 0)) * 100
            )
            : 0,
    completionRate:
        Number(stats?.playCount || 0) > 0
            ? roundToTwoDecimals(
                (Number(stats?.completedCount || 0) / Number(stats?.playCount || 0)) * 100
            )
            : 0,
    lastListenedAt: stats?.lastListenedAt
        ? new Date(stats.lastListenedAt).toISOString()
        : null,
});

const fetchTopTrackPerformanceStats = async ({ artistId, from, to }) =>
    ListenEvent.aggregate([
        {
            $match: {
                artistId,
                listenedAt: {
                    $gte: parseDateKey(from).toDate(),
                    $lt: parseDateKey(to).add(1, "day").toDate(),
                },
            },
        },
        {
            $group: {
                _id: "$trackId",
                playCount: {
                    $sum: {
                        $cond: [{ $eq: ["$isValidStream", true] }, 1, 0],
                    },
                },
                uniqueListeners: {
                    $addToSet: {
                        $cond: [{ $eq: ["$isValidStream", true] }, "$userId", null],
                    },
                },
                totalListenDuration: {
                    $sum: {
                        $cond: [
                            { $eq: ["$isValidStream", true] },
                            {
                                $ifNull: [
                                    "$listenedDuration",
                                    {
                                        $ifNull: ["$duration", 0],
                                    },
                                ],
                            },
                            0,
                        ],
                    },
                },
                skipCount: {
                    $sum: {
                        $cond: [{ $eq: ["$skipped", true] }, 1, 0],
                    },
                },
                completedCount: {
                    $sum: {
                        $cond: [{ $eq: ["$completed", true] }, 1, 0],
                    },
                },
                lastListenedAt: { $max: "$listenedAt" },
            },
        },
        {
            $project: {
                _id: 0,
                trackId: "$_id",
                playCount: 1,
                uniqueListeners: {
                    $size: {
                        $filter: {
                            input: "$uniqueListeners",
                            as: "listenerId",
                            cond: { $ne: ["$$listenerId", null] },
                        },
                    },
                },
                averageListenDuration: {
                    $cond: [
                        { $gt: ["$playCount", 0] },
                        { $divide: ["$totalListenDuration", "$playCount"] },
                        0,
                    ],
                },
                skipCount: 1,
                completedCount: 1,
                lastListenedAt: 1,
            },
        },
        {
            $sort: {
                playCount: -1,
                uniqueListeners: -1,
                averageListenDuration: -1,
                lastListenedAt: -1,
            },
        },
    ]);

export const getTopPerformingTracks = async ({
    userId,
    range,
    from,
    to,
}) => {
    const artist = await resolveArtistProfile(userId);
    const basePeriod = resolveOverviewPeriod({ range, from, to });
    const period = basePeriod.range === "all"
        ? await resolveAllTimePeriod(artist._id)
        : basePeriod;
    const performanceStats = await fetchTopTrackPerformanceStats({
        artistId: artist._id,
        from: period.from,
        to: period.to,
    });

    if (performanceStats.length === 0) {
        return {
            period,
            summary: {
                rankedTracks: 0,
                totalPlays: 0,
                totalUniqueListeners: 0,
                topTrack: null,
            },
            topTracks: [],
        };
    }

    const trackIds = performanceStats.map((item) => item.trackId);
    const tracks = await Track.find({
        _id: { $in: trackIds },
        artist_artistId: artist._id,
    })
        .select(
            "_id title avatar coverImage duration activeStatus approvalStatus stats.totalPlay"
        )
        .lean();
    const trackMap = new Map(tracks.map((track) => [String(track._id), track]));

    const topTracks = performanceStats
        .map((stats, index) => {
            const track = trackMap.get(String(stats.trackId));

            if (!track) {
                return null;
            }

            return buildTopTrackPayload({
                track,
                stats,
                rank: index + 1,
            });
        })
        .filter(Boolean);

    return {
        period,
        summary: {
            rankedTracks: topTracks.length,
            totalPlays: topTracks.reduce(
                (sum, item) => sum + Number(item?.playCount || 0),
                0
            ),
            totalUniqueListeners: topTracks.reduce(
                (sum, item) => sum + Number(item?.uniqueListeners || 0),
                0
            ),
            topTrack:
                topTracks.length > 0
                    ? {
                        rank: topTracks[0].rank,
                        title: topTracks[0].track.title,
                        playCount: topTracks[0].playCount,
                    }
                    : null,
        },
        topTracks,
    };
};

export default {
    getTopPerformingTracks,
};
