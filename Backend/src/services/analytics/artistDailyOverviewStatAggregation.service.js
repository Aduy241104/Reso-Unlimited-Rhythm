import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import ListenEvent from "../../models/ListenEvent.js";
import ArtistDailyStat from "../../models/ArtistDailyStat.js";
import { getAnalyticsTimezone } from "./trackStatAggregation.service.js";

dayjs.extend(utc);
dayjs.extend(timezone);

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

    if (targetDateInput === "__yesterday__" || !targetDateInput) {
        return dayjs().tz(analyticsTimezone).subtract(1, "day").startOf("day");
    }

    return dayjs(targetDateInput).tz(analyticsTimezone).startOf("day");
};

const buildDailyArtistStatAggregationPipeline = ({ startDate, endDate, dayDate }) => ([
    {
        $match: {
            artistId: { $exists: true, $ne: null },
            isValidStream: true,
            listenedAt: { $gte: startDate, $lt: endDate },
        },
    },
    {
        $group: {
            _id: "$artistId",
            streamCount: { $sum: 1 },
            uniqueListeners: { $addToSet: "$userId" },
        },
    },
    {
        $project: {
            _id: 0,
            artistId: "$_id",
            date: { $literal: dayDate },
            streamCount: 1,
            uniqueListeners: { $size: "$uniqueListeners" },
        },
    },
]);

const syncArtistDailyOverviewStats = async ({
    date,
    dateKey,
    startDate,
    endDate,
    dailyStats,
}) => {
    const trackedIds = dailyStats.map((stat) => stat.artistId);

    if (trackedIds.length === 0) {
        const deleteResult = await ArtistDailyStat.deleteMany(
            buildDailyDateQuery({ dateKey, startDate, endDate })
        );

        return {
            matchedArtists: 0,
            deletedCount: deleteResult.deletedCount || 0,
            upsertedCount: 0,
        };
    }

    const bulkResult = await ArtistDailyStat.bulkWrite(
        dailyStats.map((stat) => ({
            updateOne: {
                filter: { artistId: stat.artistId, dateKey },
                update: {
                    $set: {
                        dateKey,
                        date,
                        streamCount: stat.streamCount,
                        uniqueListeners: stat.uniqueListeners,
                    },
                },
                upsert: true,
            },
        }))
    );

    const deleteResult = await ArtistDailyStat.deleteMany({
        $and: [
            buildDailyDateQuery({ dateKey, startDate, endDate }),
            { artistId: { $nin: trackedIds } },
        ],
    });

    await ArtistDailyStat.deleteMany({
        $and: [
            { date: { $gte: startDate, $lt: endDate } },
            { dateKey: { $ne: dateKey } },
        ],
    });

    return {
        matchedArtists: dailyStats.length,
        deletedCount: deleteResult.deletedCount || 0,
        upsertedCount: bulkResult.upsertedCount || 0,
    };
};

export const syncArtistDailyOverviewStatsForDay = async (targetDateInput) => {
    const analyticsTimezone = getAnalyticsTimezone();
    const targetDay = resolveTargetDay(targetDateInput);
    const nextDay = targetDay.add(1, "day");
    const date = buildStoredDayDate(targetDay);
    const dateKey = targetDay.format("YYYY-MM-DD");
    const dailyStats = await ListenEvent.aggregate(
        buildDailyArtistStatAggregationPipeline({
            startDate: targetDay.toDate(),
            endDate: nextDay.toDate(),
            dayDate: date,
        })
    );

    const dailyResult = await syncArtistDailyOverviewStats({
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

export { getAnalyticsTimezone };

export default {
    syncArtistDailyOverviewStatsForDay,
    getAnalyticsTimezone,
};
