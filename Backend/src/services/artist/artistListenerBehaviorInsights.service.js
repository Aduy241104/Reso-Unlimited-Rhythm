import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { StatusCodes } from "http-status-codes";
import Artist from "../../models/Artist.js";
import Interaction from "../../models/Interaction.js";
import ListenEvent from "../../models/ListenEvent.js";
import Track from "../../models/Track.js";
import { AppError } from "../../utils/AppError.js";
import { getAnalyticsTimezone } from "../analytics/trackStatAggregation.service.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const DATE_KEY_FORMAT = "YYYY-MM-DD";
const DEFAULT_RANGE = "30d";
const ALLOWED_RANGES = new Set(["7d", "30d", "90d"]);
const UNKNOWN_LABEL = "Khong xac dinh";

const SOURCE_LABELS = {
    track_detail: "Chi tiet bai hat",
    album: "Album",
    playlist: "Playlist",
    search: "Tim kiem",
    artist_profile: "Trang nghe si",
    unknown: UNKNOWN_LABEL,
};

const LOYALTY_SEGMENTS = [
    {
        key: "single_stream",
        label: "1 luot nghe",
        test: (streamCount) => streamCount === 1,
    },
    {
        key: "repeat_2_4",
        label: "2 - 4 luot nghe",
        test: (streamCount) => streamCount >= 2 && streamCount <= 4,
    },
    {
        key: "loyal_5_9",
        label: "5 - 9 luot nghe",
        test: (streamCount) => streamCount >= 5 && streamCount <= 9,
    },
    {
        key: "super_10_plus",
        label: "10+ luot nghe",
        test: (streamCount) => streamCount >= 10,
    },
];

const roundToTwoDecimals = (value) => Number(Number(value || 0).toFixed(2));

const getTodayInAnalyticsTimezone = () =>
    dayjs().tz(getAnalyticsTimezone()).startOf("day");

const resolveArtistProfile = async (userId) => {
    const artist = await Artist.findOne({ userId }).select("_id name").lean();

    if (!artist) {
        throw new AppError("Khong tim thay ho so nghe si.", StatusCodes.NOT_FOUND);
    }

    return artist;
};

const resolveRange = (range) => {
    const normalizedRange = String(range || DEFAULT_RANGE).trim();

    if (!ALLOWED_RANGES.has(normalizedRange)) {
        throw new AppError("Khoang thoi gian thong ke khong hop le", StatusCodes.BAD_REQUEST);
    }

    return normalizedRange;
};

const resolveRangePeriod = (range) => {
    const today = getTodayInAnalyticsTimezone();
    const dayCount = Number.parseInt(range.replace("d", ""), 10);
    const from = today.subtract(dayCount - 1, "day");

    return {
        from,
        to: today,
        range,
        fromDateKey: from.format(DATE_KEY_FORMAT),
        toDateKey: today.format(DATE_KEY_FORMAT),
        startDate: from.toDate(),
        endDateExclusive: today.add(1, "day").toDate(),
    };
};

const createBreakdownItem = ({ key, label, count, total }) => ({
    key,
    label,
    count,
    percentage: total > 0 ? roundToTwoDecimals((count / total) * 100) : 0,
});

const aggregateBehaviorSummary = async ({
    artistId,
    startDate,
    endDateExclusive,
}) => {
    const [summary] = await ListenEvent.aggregate([
        {
            $match: {
                artistId,
                listenedAt: {
                    $gte: startDate,
                    $lt: endDateExclusive,
                },
            },
        },
        {
            $group: {
                _id: null,
                totalStreams: { $sum: 1 },
                uniqueListeners: { $addToSet: "$userId" },
                completedStreams: {
                    $sum: {
                        $cond: [{ $eq: ["$completed", true] }, 1, 0],
                    },
                },
                skippedStreams: {
                    $sum: {
                        $cond: [{ $eq: ["$skipped", true] }, 1, 0],
                    },
                },
            },
        },
        {
            $project: {
                _id: 0,
                totalStreams: 1,
                uniqueListeners: { $size: "$uniqueListeners" },
                completedStreams: 1,
                skippedStreams: 1,
            },
        },
    ]);

    return {
        totalStreams: Number(summary?.totalStreams || 0),
        uniqueListeners: Number(summary?.uniqueListeners || 0),
        completedStreams: Number(summary?.completedStreams || 0),
        skippedStreams: Number(summary?.skippedStreams || 0),
    };
};

const aggregateDailyBehaviorStats = async ({
    artistId,
    startDate,
    endDateExclusive,
}) => {
    const results = await ListenEvent.aggregate([
        {
            $match: {
                artistId,
                listenedAt: {
                    $gte: startDate,
                    $lt: endDateExclusive,
                },
            },
        },
        {
            $group: {
                _id: {
                    $dateToString: {
                        format: "%Y-%m-%d",
                        date: "$listenedAt",
                        timezone: getAnalyticsTimezone(),
                    },
                },
                streamCount: { $sum: 1 },
                uniqueListeners: { $addToSet: "$userId" },
                completedStreams: {
                    $sum: {
                        $cond: [{ $eq: ["$completed", true] }, 1, 0],
                    },
                },
                skippedStreams: {
                    $sum: {
                        $cond: [{ $eq: ["$skipped", true] }, 1, 0],
                    },
                },
            },
        },
        {
            $project: {
                _id: 0,
                date: "$_id",
                streamCount: 1,
                uniqueListeners: { $size: "$uniqueListeners" },
                completionRate: {
                    $cond: [
                        { $gt: ["$streamCount", 0] },
                        {
                            $multiply: [
                                { $divide: ["$completedStreams", "$streamCount"] },
                                100,
                            ],
                        },
                        0,
                    ],
                },
                skipRate: {
                    $cond: [
                        { $gt: ["$streamCount", 0] },
                        {
                            $multiply: [
                                { $divide: ["$skippedStreams", "$streamCount"] },
                                100,
                            ],
                        },
                        0,
                    ],
                },
            },
        },
        {
            $sort: {
                date: 1,
            },
        },
    ]);

    return results.map((item) => ({
        date: item.date,
        streamCount: Number(item.streamCount || 0),
        uniqueListeners: Number(item.uniqueListeners || 0),
        completionRate: roundToTwoDecimals(item.completionRate),
        skipRate: roundToTwoDecimals(item.skipRate),
    }));
};

const fillMissingDailyStats = ({ stats = [], from, to }) => {
    const statMap = new Map(stats.map((stat) => [String(stat.date), stat]));
    const filledStats = [];
    let cursor = from.startOf("day");

    while (cursor.isBefore(to) || cursor.isSame(to, "day")) {
        const dateKey = cursor.format(DATE_KEY_FORMAT);
        const stat = statMap.get(dateKey);

        filledStats.push({
            date: dateKey,
            streamCount: Number(stat?.streamCount || 0),
            uniqueListeners: Number(stat?.uniqueListeners || 0),
            completionRate: roundToTwoDecimals(stat?.completionRate || 0),
            skipRate: roundToTwoDecimals(stat?.skipRate || 0),
        });

        cursor = cursor.add(1, "day");
    }

    return filledStats;
};

const aggregateListenerFrequency = async ({
    artistId,
    startDate,
    endDateExclusive,
}) =>
    ListenEvent.aggregate([
        {
            $match: {
                artistId,
                userId: { $exists: true, $ne: null },
                listenedAt: {
                    $gte: startDate,
                    $lt: endDateExclusive,
                },
            },
        },
        {
            $group: {
                _id: "$userId",
                streamCount: { $sum: 1 },
            },
        },
        {
            $sort: {
                streamCount: -1,
                _id: 1,
            },
        },
    ]);

const buildLoyaltySegments = (listenerFrequency = []) => {
    const totalListeners = listenerFrequency.length;

    return LOYALTY_SEGMENTS.map((segment) =>
        createBreakdownItem({
            key: segment.key,
            label: segment.label,
            count: listenerFrequency.filter((item) => segment.test(item.streamCount)).length,
            total: totalListeners,
        })
    );
};

const aggregateFieldBreakdown = async ({
    artistId,
    startDate,
    endDateExclusive,
    fieldName,
}) =>
    ListenEvent.aggregate([
        {
            $match: {
                artistId,
                listenedAt: {
                    $gte: startDate,
                    $lt: endDateExclusive,
                },
            },
        },
        {
            $group: {
                _id: `$${fieldName}`,
                count: { $sum: 1 },
            },
        },
    ]);

const buildSourceBreakdown = (items = []) => {
    const total = items.reduce(
        (sum, item) => sum + Number(item?.count || 0),
        0
    );

    return items
        .map((item) => {
            const sourceKey = String(item?._id || "unknown").trim() || "unknown";

            return createBreakdownItem({
                key: sourceKey,
                label: SOURCE_LABELS[sourceKey] || sourceKey,
                count: Number(item?.count || 0),
                total,
            });
        })
        .sort((left, right) => {
            if (right.count !== left.count) {
                return right.count - left.count;
            }

            return left.label.localeCompare(right.label);
        });
};

const toTitleCase = (value) =>
    value
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(" ");

const buildDeviceBreakdown = (items = []) => {
    const total = items.reduce(
        (sum, item) => sum + Number(item?.count || 0),
        0
    );

    return items
        .map((item) => {
            const rawValue = String(item?._id || "").trim();
            const deviceLabel = rawValue ? toTitleCase(rawValue) : UNKNOWN_LABEL;

            return createBreakdownItem({
                key: rawValue || "unknown",
                label: deviceLabel,
                count: Number(item?.count || 0),
                total,
            });
        })
        .sort((left, right) => {
            if (right.count !== left.count) {
                return right.count - left.count;
            }

            return left.label.localeCompare(right.label);
        });
};

const aggregateListeningHours = async ({
    artistId,
    startDate,
    endDateExclusive,
}) =>
    ListenEvent.aggregate([
        {
            $match: {
                artistId,
                listenedAt: {
                    $gte: startDate,
                    $lt: endDateExclusive,
                },
            },
        },
        {
            $group: {
                _id: {
                    $hour: {
                        date: "$listenedAt",
                        timezone: getAnalyticsTimezone(),
                    },
                },
                count: { $sum: 1 },
            },
        },
    ]);

const buildListeningHoursBreakdown = (items = []) => {
    const total = items.reduce(
        (sum, item) => sum + Number(item?.count || 0),
        0
    );

    return items
        .map((item) => {
            const hour = Number(item?._id);
            const hourLabel = `${String(hour).padStart(2, "0")}:00 - ${String(hour).padStart(2, "0")}:59`;

            return createBreakdownItem({
                key: String(hour),
                label: hourLabel,
                count: Number(item?.count || 0),
                total,
            });
        })
        .sort((left, right) => {
            if (right.count !== left.count) {
                return right.count - left.count;
            }

            return Number(left.key) - Number(right.key);
        });
};

const buildInteractionMatch = ({ artistId, trackIds = [], listenerIds = [] }) => {
    const targets = [
        {
            targetType: "Artist",
            targetId: artistId,
        },
    ];

    if (trackIds.length > 0) {
        targets.push({
            targetType: "Track",
            targetId: {
                $in: trackIds,
            },
        });
    }

    return {
        userId: {
            $in: listenerIds,
        },
        action: {
            $in: ["like", "follow"],
        },
        $or: targets,
    };
};

const aggregateEngagement = async ({
    artistId,
    startDate,
    endDateExclusive,
    listenerFrequency = [],
}) => {
    const listenerIds = listenerFrequency
        .map((item) => item?._id)
        .filter(Boolean);

    if (listenerIds.length === 0) {
        return {
            engagedListeners: 0,
            followActions: 0,
            likeActions: 0,
            totalActions: 0,
            engagementRate: 0,
        };
    }

    const tracks = await Track.find({ artist_artistId: artistId })
        .select("_id")
        .lean();
    const trackIds = tracks.map((track) => track._id);

    const [summary] = await Interaction.aggregate([
        {
            $match: {
                ...buildInteractionMatch({
                    artistId,
                    trackIds,
                    listenerIds,
                }),
                createdAt: {
                    $gte: startDate,
                    $lt: endDateExclusive,
                },
            },
        },
        {
            $group: {
                _id: null,
                engagedListeners: {
                    $addToSet: "$userId",
                },
                followActions: {
                    $sum: {
                        $cond: [{ $eq: ["$action", "follow"] }, 1, 0],
                    },
                },
                likeActions: {
                    $sum: {
                        $cond: [{ $eq: ["$action", "like"] }, 1, 0],
                    },
                },
                totalActions: { $sum: 1 },
            },
        },
        {
            $project: {
                _id: 0,
                engagedListeners: { $size: "$engagedListeners" },
                followActions: 1,
                likeActions: 1,
                totalActions: 1,
            },
        },
    ]);

    const engagedListeners = Number(summary?.engagedListeners || 0);
    const uniqueListeners = listenerIds.length;

    return {
        engagedListeners,
        followActions: Number(summary?.followActions || 0),
        likeActions: Number(summary?.likeActions || 0),
        totalActions: Number(summary?.totalActions || 0),
        engagementRate:
            uniqueListeners > 0
                ? roundToTwoDecimals((engagedListeners / uniqueListeners) * 100)
                : 0,
    };
};

export const getArtistListenerBehaviorInsights = async ({
    userId,
    range,
}) => {
    const artist = await resolveArtistProfile(userId);
    const selectedRange = resolveRange(range);
    const period = resolveRangePeriod(selectedRange);

    const [
        summary,
        dailyStats,
        listenerFrequency,
        sourceStats,
        deviceStats,
        listeningHours,
    ] = await Promise.all([
        aggregateBehaviorSummary({
            artistId: artist._id,
            startDate: period.startDate,
            endDateExclusive: period.endDateExclusive,
        }),
        aggregateDailyBehaviorStats({
            artistId: artist._id,
            startDate: period.startDate,
            endDateExclusive: period.endDateExclusive,
        }),
        aggregateListenerFrequency({
            artistId: artist._id,
            startDate: period.startDate,
            endDateExclusive: period.endDateExclusive,
        }),
        aggregateFieldBreakdown({
            artistId: artist._id,
            startDate: period.startDate,
            endDateExclusive: period.endDateExclusive,
            fieldName: "source",
        }),
        aggregateFieldBreakdown({
            artistId: artist._id,
            startDate: period.startDate,
            endDateExclusive: period.endDateExclusive,
            fieldName: "device",
        }),
        aggregateListeningHours({
            artistId: artist._id,
            startDate: period.startDate,
            endDateExclusive: period.endDateExclusive,
        }),
    ]);

    const returningListeners = listenerFrequency.filter(
        (item) => Number(item?.streamCount || 0) >= 2
    ).length;
    const engagement = await aggregateEngagement({
        artistId: artist._id,
        startDate: period.startDate,
        endDateExclusive: period.endDateExclusive,
        listenerFrequency,
    });

    return {
        artist: {
            id: String(artist._id),
            name: artist.name || "Nghe si",
        },
        range: selectedRange,
        period: {
            from: period.fromDateKey,
            to: period.toDateKey,
        },
        summary: {
            totalStreams: summary.totalStreams,
            uniqueListeners: summary.uniqueListeners,
            returningListeners,
            averageStreamsPerListener:
                summary.uniqueListeners > 0
                    ? roundToTwoDecimals(
                        summary.totalStreams / summary.uniqueListeners
                    )
                    : 0,
            completionRate:
                summary.totalStreams > 0
                    ? roundToTwoDecimals(
                        (summary.completedStreams / summary.totalStreams) * 100
                    )
                    : 0,
            skipRate:
                summary.totalStreams > 0
                    ? roundToTwoDecimals(
                        (summary.skippedStreams / summary.totalStreams) * 100
                    )
                    : 0,
            engagementRate: engagement.engagementRate,
        },
        dailyStats: fillMissingDailyStats({
            stats: dailyStats,
            from: period.from,
            to: period.to,
        }),
        behavior: {
            sources: buildSourceBreakdown(sourceStats),
            devices: buildDeviceBreakdown(deviceStats),
            listeningHours: buildListeningHoursBreakdown(listeningHours),
            loyaltySegments: buildLoyaltySegments(listenerFrequency),
            engagement,
        },
    };
};

export default {
    getArtistListenerBehaviorInsights,
};
