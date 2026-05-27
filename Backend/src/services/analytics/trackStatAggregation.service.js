import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import ListenEvent from "../../models/ListenEvent.js";
import TrackDailyStat from "../../models/TrackDailyStat.js";
import TrackMonthlyStat from "../../models/TrackMonthlyStat.js";

dayjs.extend(utc);
dayjs.extend(timezone);

export const getAnalyticsTimezone = () =>
    process.env.ANALYTICS_TIMEZONE ||
    process.env.CRON_TIMEZONE ||
    "Asia/Ho_Chi_Minh";

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
            playCount: { $sum: 1 },
            uniqueListeners: { $addToSet: "$userId" },
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
            uniqueListeners: { $size: "$uniqueListeners" },
            skipCount: 1,
        },
    },
]);

const buildMonthlyAggregationPipeline = ({ startDate, endDate }) => ([
    {
        $match: {
            trackId: { $exists: true, $ne: null },
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

const syncDailyTrackStats = async ({ date, nextDate, dailyStats }) => {
    const trackedIds = dailyStats.map((stat) => stat.trackId);

    if (trackedIds.length === 0) {
        const deleteResult = await TrackDailyStat.deleteMany({
            date: { $gte: date, $lt: nextDate },
        });

        return {
            matchedTracks: 0,
            deletedCount: deleteResult.deletedCount || 0,
            upsertedCount: 0,
        };
    }

    const bulkResult = await TrackDailyStat.bulkWrite(
        dailyStats.map((stat) => ({
            updateOne: {
                filter: { trackId: stat.trackId, date },
                update: {
                    $set: {
                        playCount: stat.playCount,
                        uniqueListeners: stat.uniqueListeners,
                        skipCount: stat.skipCount,
                    },
                },
                upsert: true,
            },
        }))
    );

    const deleteResult = await TrackDailyStat.deleteMany({
        date: { $gte: date, $lt: nextDate },
        $or: [
            { trackId: { $nin: trackedIds } },
            { date: { $ne: date } },
        ],
    });

    return {
        matchedTracks: dailyStats.length,
        deletedCount: deleteResult.deletedCount || 0,
        upsertedCount: bulkResult.upsertedCount || 0,
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

export const syncTrackStatsForDay = async (targetDateInput) => {
    const analyticsTimezone = getAnalyticsTimezone();
    const targetDay = targetDateInput
        ? dayjs(targetDateInput).tz(analyticsTimezone).startOf("day")
        : dayjs().tz(analyticsTimezone).subtract(1, "day").startOf("day");

    const nextDay = targetDay.add(1, "day");
    const date = targetDay.toDate();
    const dailyStats = await ListenEvent.aggregate(
        buildDailyAggregationPipeline({
            startDate: targetDay.toDate(),
            endDate: nextDay.toDate(),
            dayDate: date,
        })
    );

    const dailyResult = await syncDailyTrackStats({
        date,
        nextDate: nextDay.toDate(),
        dailyStats,
    });

    return {
        timezone: analyticsTimezone,
        targetDate: targetDay.format("YYYY-MM-DD"),
        daily: dailyResult,
    };
};

export const syncTrackStatsForMonth = async (targetMonthInput) => {
    const analyticsTimezone = getAnalyticsTimezone();
    const targetMonth = targetMonthInput
        ? dayjs(targetMonthInput).tz(analyticsTimezone).startOf("month")
        : dayjs().tz(analyticsTimezone).subtract(1, "month").startOf("month");

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

export default {
    syncTrackStatsForDay,
    syncTrackStatsForMonth,
    getAnalyticsTimezone,
};
