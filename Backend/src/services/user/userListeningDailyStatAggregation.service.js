import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import mongoose from "mongoose";
import RecentListeningActivity from "../../models/user.recentListening.model.js";
import UserListeningDailyStat from "../../models/UserListeningDailyStat.js";
import { getAnalyticsTimezone } from "../analytics/trackStatAggregation.service.js";

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

    if (targetDateInput === "__yesterday__") {
        return dayjs().tz(analyticsTimezone).subtract(1, "day").startOf("day");
    }

    if (targetDateInput) {
        return dayjs(targetDateInput).tz(analyticsTimezone).startOf("day");
    }

    return dayjs().tz(analyticsTimezone).startOf("day");
};

export const syncUserListeningDailyStatsForDay = async (targetDateInput) => {
    const analyticsTimezone = getAnalyticsTimezone();
    const targetDay = resolveTargetDay(targetDateInput);
    const nextDay = targetDay.add(1, "day");
    const dateKey = targetDay.format("YYYY-MM-DD");
    const date = buildStoredDayDate(targetDay);

    const aggregatedDailyStats = await RecentListeningActivity.aggregate([
        {
            $match: {
                listenedAt: {
                    $gte: targetDay.toDate(),
                    $lt: nextDay.toDate(),
                },
            },
        },
        {
            $group: {
                _id: "$userId",
                listenCount: { $sum: 1 },
                totalListenedDuration: {
                    $sum: { $ifNull: ["$listenedDuration", 0] },
                },
                uniqueTracks: { $addToSet: "$trackId" },
            },
        },
        {
            $project: {
                _id: 0,
                userId: "$_id",
                listenCount: 1,
                totalListenedDuration: 1,
                uniqueTracks: { $size: "$uniqueTracks" },
            },
        },
    ]);

    const trackedUserIds = aggregatedDailyStats.map((stat) => stat.userId);

    if (trackedUserIds.length === 0) {
        const deleteResult = await UserListeningDailyStat.deleteMany(
            buildDailyDateQuery({
                dateKey,
                startDate: targetDay.toDate(),
                endDate: nextDay.toDate(),
            })
        );

        return {
            timezone: analyticsTimezone,
            targetDate: dateKey,
            storedUsers: 0,
            deletedCount: deleteResult.deletedCount || 0,
            upsertedCount: 0,
        };
    }

    const bulkResult = await UserListeningDailyStat.bulkWrite(
        aggregatedDailyStats.map((stat) => ({
            updateOne: {
                filter: {
                    userId: new mongoose.Types.ObjectId(String(stat.userId)),
                    dateKey,
                },
                update: {
                    $set: {
                        userId: stat.userId,
                        dateKey,
                        date,
                        listenCount: Number(stat.listenCount || 0),
                        totalListenedDuration: Number(stat.totalListenedDuration || 0),
                        uniqueTracks: Number(stat.uniqueTracks || 0),
                    },
                },
                upsert: true,
            },
        }))
    );

    const deleteResult = await UserListeningDailyStat.deleteMany({
        $and: [
            buildDailyDateQuery({
                dateKey,
                startDate: targetDay.toDate(),
                endDate: nextDay.toDate(),
            }),
            { userId: { $nin: trackedUserIds } },
        ],
    });

    await UserListeningDailyStat.deleteMany({
        $and: [
            { date: { $gte: targetDay.toDate(), $lt: nextDay.toDate() } },
            { dateKey: { $ne: dateKey } },
        ],
    });

    return {
        timezone: analyticsTimezone,
        targetDate: dateKey,
        storedUsers: aggregatedDailyStats.length,
        deletedCount: deleteResult.deletedCount || 0,
        upsertedCount: bulkResult.upsertedCount || 0,
    };
};

export default {
    syncUserListeningDailyStatsForDay,
};
