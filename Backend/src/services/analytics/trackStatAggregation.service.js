import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import redisClient from "../../config/redisConfig.js";
import ListenEvent from "../../models/ListenEvent.js";
import TrackDailyRanking from "../../models/TrackDailyRanking.js";
import TrackDailyStat from "../../models/TrackDailyStat.js";
import TrackMonthlyRanking from "../../models/TrackMonthlyRanking.js";
import TrackMonthlyStat from "../../models/TrackMonthlyStat.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const TRACK_RANKING_LIMIT = 100;

export const getAnalyticsTimezone = () =>
    process.env.ANALYTICS_TIMEZONE ||
    process.env.CRON_TIMEZONE ||
    "Asia/Ho_Chi_Minh";

const buildStoredDayDate = (targetDay) =>
    dayjs.utc(`${targetDay.format("YYYY-MM-DD")}T00:00:00Z`).toDate();

const buildDailyDateQuery = ({ dateKey, startDate, endDate }) => ({
    $or: [
        { dateKey },
        { date: { $gte: startDate, $lt: endDate } },
    ],
});

const resolveTargetDay = (targetDateInput) => {
    const analyticsTimezone = getAnalyticsTimezone();

    if (targetDateInput === "__yesterday__") {
        return dayjs().tz(analyticsTimezone).subtract(1, "day").startOf("day");
    }

    if (targetDateInput) {
        return dayjs(targetDateInput).tz(analyticsTimezone).startOf("day");
    }

    return dayjs().tz(analyticsTimezone).startOf("day");
};

const resolveTargetMonth = (targetMonthInput) => {
    const analyticsTimezone = getAnalyticsTimezone();

    if (targetMonthInput === "__yesterday_month__" || !targetMonthInput) {
        return dayjs().tz(analyticsTimezone).subtract(1, "day").startOf("month");
    }

    return dayjs(targetMonthInput).tz(analyticsTimezone).startOf("month");
};

const buildDailyAggregationPipeline = ({ startDate, endDate, dayDate }) => ([
    {
        $match: {
            trackId: { $exists: true, $ne: null },
            listenedAt: { $gte: startDate, $lt: endDate },
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
                    $cond: [{ $eq: ["$isValidStream", true] }, "$duration", 0],
                },
            },
            skipCount: {
                $sum: {
                    $cond: [{ $eq: ["$skipped", true] }, 1, 0],
                },
            },
        },
    },
    {
        $project: {
            _id: 0,
            trackId: "$_id",
            date: { $literal: dayDate },
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
        },
    },
]);

const buildMonthlyAggregationPipeline = ({ startDate, endDate }) => ([
    {
        $match: {
            trackId: { $exists: true, $ne: null },
            isValidStream: true,
            listenedAt: { $gte: startDate, $lt: endDate },
        },
    },
    {
        $group: {
            _id: "$trackId",
            playCount: { $sum: 1 },
            uniqueListeners: { $addToSet: "$userId" },
        },
    },
    {
        $project: {
            _id: 0,
            trackId: "$_id",
            playCount: 1,
            uniqueListeners: { $size: "$uniqueListeners" },
        },
    },
]);

const invalidateTrackRankingCaches = async (pattern) => {
    if (!redisClient.isOpen) {
        return 0;
    }

    let cursor = "0";
    let deletedKeys = 0;

    do {
        const result = await redisClient.scan(cursor, {
            MATCH: pattern,
            COUNT: 100,
        });

        cursor = result.cursor;

        if (result.keys.length > 0) {
            deletedKeys += result.keys.length;
            await redisClient.del(result.keys);
        }
    } while (cursor !== "0");

    return deletedKeys;
};

const syncDailyTrackStats = async ({ date, dateKey, startDate, endDate, dailyStats }) => {
    const trackedIds = dailyStats.map((stat) => stat.trackId);

    if (trackedIds.length === 0) {
        const deleteResult = await TrackDailyStat.deleteMany(
            buildDailyDateQuery({ dateKey, startDate, endDate })
        );

        return {
            matchedTracks: 0,
            deletedCount: deleteResult.deletedCount || 0,
            upsertedCount: 0,
        };
    }

    const bulkResult = await TrackDailyStat.bulkWrite(
        dailyStats.map((stat) => ({
            updateOne: {
                filter: { trackId: stat.trackId, dateKey },
                update: {
                    $set: {
                        dateKey,
                        date,
                        playCount: stat.playCount,
                        uniqueListeners: stat.uniqueListeners,
                        averageListenDuration: stat.averageListenDuration,
                        skipCount: stat.skipCount,
                    },
                },
                upsert: true,
            },
        }))
    );

    const deleteResult = await TrackDailyStat.deleteMany({
        $and: [
            buildDailyDateQuery({ dateKey, startDate, endDate }),
            { trackId: { $nin: trackedIds } },
        ],
    });

    await TrackDailyStat.deleteMany({
        $and: [
            { date: { $gte: startDate, $lt: endDate } },
            { dateKey: { $ne: dateKey } },
        ],
    });

    return {
        matchedTracks: dailyStats.length,
        deletedCount: deleteResult.deletedCount || 0,
        upsertedCount: bulkResult.upsertedCount || 0,
    };
};

const buildDailyTrackRankings = (dailyStats) =>
    [...dailyStats]
        .filter((stat) => Number(stat?.playCount || 0) > 0)
        .sort((left, right) => {
            if (right.playCount !== left.playCount) {
                return right.playCount - left.playCount;
            }

            if (right.uniqueListeners !== left.uniqueListeners) {
                return right.uniqueListeners - left.uniqueListeners;
            }

            return String(left.trackId).localeCompare(String(right.trackId));
        })
        .slice(0, TRACK_RANKING_LIMIT)
        .map((stat, index) => ({
            trackId: stat.trackId,
            playCount: stat.playCount,
            uniqueListeners: stat.uniqueListeners,
            averageListenDuration: stat.averageListenDuration,
            skipCount: stat.skipCount,
            rank: index + 1,
        }));

const buildPreviousDailyRankMap = async ({ previousDate, nextPreviousDate, previousDateKey }) => {
    const previousRankingDocument = await TrackDailyRanking.findOne(
        buildDailyDateQuery({
            dateKey: previousDateKey,
            startDate: previousDate,
            endDate: nextPreviousDate,
        })
    )
        .lean()
        .select("rankings.trackId rankings.rank");

    const previousRankings = Array.isArray(previousRankingDocument?.rankings)
        ? previousRankingDocument.rankings
        : [];

    return new Map(
        previousRankings
            .filter((item) => item?.trackId && Number.isInteger(item?.rank))
            .map((item) => [String(item.trackId), item.rank])
    );
};

const attachDailyRankMovement = (rankings, previousRankMap) =>
    rankings.map((ranking) => {
        const previousRank = previousRankMap.get(String(ranking.trackId)) ?? null;

        if (!previousRank) {
            return {
                ...ranking,
                previousRank: null,
                rankChange: 0,
                rankTrend: "new",
            };
        }

        const rankChange = previousRank - ranking.rank;

        return {
            ...ranking,
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

const syncDailyTrackRankings = async ({
    date,
    dateKey,
    startDate,
    endDate,
    dailyStats,
}) => {
    const previousDay = dayjs.utc(`${dateKey}T00:00:00Z`).subtract(1, "day");
    const previousDate = previousDay.toDate();
    const nextPreviousDate = previousDay.add(1, "day").toDate();
    const previousDateKey = previousDay.format("YYYY-MM-DD");
    const previousRankMap = await buildPreviousDailyRankMap({
        previousDate,
        nextPreviousDate,
        previousDateKey,
    });
    const rankings = attachDailyRankMovement(
        buildDailyTrackRankings(dailyStats),
        previousRankMap
    );

    if (rankings.length === 0) {
        const deleteResult = await TrackDailyRanking.deleteMany(
            buildDailyDateQuery({ dateKey, startDate, endDate })
        );
        const invalidatedCacheKeys = await invalidateTrackRankingCaches(
            `top_tracks:daily:${dateKey}:limit:*`
        );

        return {
            storedTracks: 0,
            deletedCount: deleteResult.deletedCount || 0,
            upsertedCount: 0,
            invalidatedCacheKeys,
            comparedWithDate: dayjs(previousDate).format("YYYY-MM-DD"),
        };
    }

    const deleteResult = await TrackDailyRanking.deleteMany(
        buildDailyDateQuery({ dateKey, startDate, endDate })
    );

    await TrackDailyRanking.create({
        dateKey,
        date,
        rankings,
    });

    const invalidatedCacheKeys = await invalidateTrackRankingCaches(
        `top_tracks:daily:${dateKey}:limit:*`
    );

    return {
        storedTracks: rankings.length,
        deletedCount: deleteResult.deletedCount || 0,
        upsertedCount: 1,
        invalidatedCacheKeys,
        comparedWithDate: dayjs(previousDate).format("YYYY-MM-DD"),
    };
};

const syncMonthlyTrackStats = async ({ year, month, monthlyStats }) => {
    const trackedIds = monthlyStats.map((stat) => stat.trackId);

    if (trackedIds.length === 0) {
        const deleteResult = await TrackMonthlyStat.deleteMany({ year, month });

        return {
            matchedTracks: 0,
            deletedCount: deleteResult.deletedCount || 0,
            upsertedCount: 0,
        };
    }

    const bulkResult = await TrackMonthlyStat.bulkWrite(
        monthlyStats.map((stat) => ({
            updateOne: {
                filter: { trackId: stat.trackId, year, month },
                update: {
                    $set: {
                        playCount: stat.playCount,
                        uniqueListeners: stat.uniqueListeners,
                    },
                },
                upsert: true,
            },
        }))
    );

    const deleteResult = await TrackMonthlyStat.deleteMany({
        year,
        month,
        trackId: { $nin: trackedIds },
    });

    return {
        matchedTracks: monthlyStats.length,
        deletedCount: deleteResult.deletedCount || 0,
        upsertedCount: bulkResult.upsertedCount || 0,
    };
};

const buildMonthlyTrackRankings = (monthlyStats) =>
    [...monthlyStats]
        .sort((left, right) => {
            if (right.playCount !== left.playCount) {
                return right.playCount - left.playCount;
            }

            if (right.uniqueListeners !== left.uniqueListeners) {
                return right.uniqueListeners - left.uniqueListeners;
            }

            return String(left.trackId).localeCompare(String(right.trackId));
        })
        .slice(0, TRACK_RANKING_LIMIT)
        .map((stat, index) => ({
            trackId: stat.trackId,
            playCount: stat.playCount,
            uniqueListeners: stat.uniqueListeners,
            rank: index + 1,
        }));

const syncMonthlyTrackRankings = async ({ year, month, monthlyStats, monthKey }) => {
    const rankings = buildMonthlyTrackRankings(monthlyStats);

    if (rankings.length === 0) {
        const deleteResult = await TrackMonthlyRanking.deleteMany({ year, month });
        const invalidatedCacheKeys = await invalidateTrackRankingCaches(
            `top_tracks:monthly:${monthKey}:limit:*`
        );

        return {
            storedTracks: 0,
            deletedCount: deleteResult.deletedCount || 0,
            upsertedCount: 0,
            invalidatedCacheKeys,
        };
    }

    const deleteResult = await TrackMonthlyRanking.deleteMany({ year, month });

    await TrackMonthlyRanking.create({
        year,
        month,
        rankings,
    });

    const invalidatedCacheKeys = await invalidateTrackRankingCaches(
        `top_tracks:monthly:${monthKey}:limit:*`
    );

    return {
        storedTracks: rankings.length,
        deletedCount: deleteResult.deletedCount || 0,
        upsertedCount: 1,
        invalidatedCacheKeys,
    };
};

export const syncTrackStatsForDay = async (targetDateInput) => {
    const analyticsTimezone = getAnalyticsTimezone();
    const targetDay = resolveTargetDay(targetDateInput);
    const nextDay = targetDay.add(1, "day");
    const date = buildStoredDayDate(targetDay);
    const dateKey = targetDay.format("YYYY-MM-DD");
    const dailyStats = await ListenEvent.aggregate(
        buildDailyAggregationPipeline({
            startDate: targetDay.toDate(),
            endDate: nextDay.toDate(),
            dayDate: date,
        })
    );

    const dailyResult = await syncDailyTrackStats({
        date,
        dateKey,
        startDate: targetDay.toDate(),
        endDate: nextDay.toDate(),
        dailyStats,
    });

    return {
        timezone: analyticsTimezone,
        targetDate: targetDay.format("YYYY-MM-DD"),
        daily: dailyResult,
    };
};

export const syncTrackRankingsForDay = async (targetDateInput) => {
    const analyticsTimezone = getAnalyticsTimezone();
    const targetDay = resolveTargetDay(targetDateInput);
    const nextDay = targetDay.add(1, "day");
    const date = buildStoredDayDate(targetDay);
    const dateKey = targetDay.format("YYYY-MM-DD");
    const dailyStats = await TrackDailyStat.find(
        buildDailyDateQuery({
            dateKey,
            startDate: targetDay.toDate(),
            endDate: nextDay.toDate(),
        })
    )
        .lean()
        .select("trackId playCount uniqueListeners averageListenDuration skipCount");

    const rankingResult = await syncDailyTrackRankings({
        date,
        dateKey,
        startDate: targetDay.toDate(),
        endDate: nextDay.toDate(),
        dailyStats,
    });

    return {
        timezone: analyticsTimezone,
        targetDate: dateKey,
        ranking: rankingResult,
    };
};

export const syncTrackStatsForMonth = async (targetMonthInput) => {
    const analyticsTimezone = getAnalyticsTimezone();
    const targetMonth = resolveTargetMonth(targetMonthInput);
    const nextMonth = targetMonth.add(1, "month");
    const monthlyStats = await ListenEvent.aggregate(
        buildMonthlyAggregationPipeline({
            startDate: targetMonth.toDate(),
            endDate: nextMonth.toDate(),
        })
    );

    const monthlyResult = await syncMonthlyTrackStats({
        year: targetMonth.year(),
        month: targetMonth.month() + 1,
        monthlyStats,
    });

    return {
        timezone: analyticsTimezone,
        targetMonth: targetMonth.format("YYYY-MM"),
        monthly: monthlyResult,
    };
};

export const syncTrackRankingsForMonth = async (
    targetMonthInput = "__yesterday_month__"
) => {
    const analyticsTimezone = getAnalyticsTimezone();
    const targetMonth = resolveTargetMonth(targetMonthInput);
    const year = targetMonth.year();
    const month = targetMonth.month() + 1;
    const monthKey = targetMonth.format("YYYY-MM");
    const monthlyStats = await TrackMonthlyStat.find({ year, month })
        .lean()
        .select("trackId playCount uniqueListeners");

    const rankingResult = await syncMonthlyTrackRankings({
        year,
        month,
        monthlyStats,
        monthKey,
    });

    return {
        timezone: analyticsTimezone,
        targetMonth: monthKey,
        ranking: rankingResult,
    };
};

export const syncTrackAnalyticsForDay = async (targetDateInput) => {
    const statsResult = await syncTrackStatsForDay(targetDateInput);
    const rankingResult = await syncTrackRankingsForDay(targetDateInput);

    return {
        ...statsResult,
        ranking: rankingResult.ranking,
    };
};

export const syncTrackAnalyticsForMonth = async (targetMonthInput) => {
    const statsResult = await syncTrackStatsForMonth(targetMonthInput);
    const rankingResult = await syncTrackRankingsForMonth(targetMonthInput);

    return {
        ...statsResult,
        ranking: rankingResult.ranking,
    };
};

export default {
    syncTrackAnalyticsForDay,
    syncTrackAnalyticsForMonth,
    syncTrackRankingsForDay,
    syncTrackRankingsForMonth,
    syncTrackStatsForDay,
    syncTrackStatsForMonth,
    getAnalyticsTimezone,
};
