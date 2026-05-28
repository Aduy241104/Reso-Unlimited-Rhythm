import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import PlatformMonthlyStat from "../../models/PlatformMonthlyStat.js";
import TrackDailyStat from "../../models/TrackDailyStat.js";
import ListenEvent from "../../models/ListenEvent.js";
import User from "../../models/User.js";
import Artist from "../../models/Artist.js";
import Track from "../../models/Track.js";
import { getAnalyticsTimezone } from "../analytics/trackStatAggregation.service.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const getDateRangeOfMonth = (year, month) => {
    const analyticsTimezone = getAnalyticsTimezone();
    const startOfMonth = dayjs().tz(analyticsTimezone).year(year).month(month - 1).startOf("month");
    const endOfMonth = startOfMonth.add(1, "month");
    return {
        periodStart: startOfMonth.toDate(),
        periodEnd: endOfMonth.toDate(),
        startDate: startOfMonth.toDate(),
        nextDate: endOfMonth.toDate(),
    };
};

export const getOverviewStats = async () => {
    const analyticsTimezone = getAnalyticsTimezone();
    const now = dayjs().tz(analyticsTimezone);
    const currentYear = now.year();
    const currentMonth = now.month() + 1;

    const { periodStart, periodEnd } = getDateRangeOfMonth(currentYear, currentMonth);

    const monthlyStat = await PlatformMonthlyStat.findOne({ year: currentYear, month: currentMonth }).lean();

    const [
        totalUsers,
        totalArtists,
        totalTracks,
        totalStreamsThisMonth,
        totalStreamsAllTime,
        last7DaysRaw,
    ] = await Promise.all([
        User.countDocuments({}),
        Artist.countDocuments({}),
        Track.countDocuments({ activeStatus: "active", approvalStatus: "approved" }),
        TrackDailyStat.aggregate([
            { $match: { date: { $gte: periodStart, $lt: periodEnd } } },
            { $group: { _id: null, total: { $sum: "$playCount" } } },
        ]),
        TrackDailyStat.aggregate([
            { $group: { _id: null, total: { $sum: "$playCount" } } },
        ]),
        TrackDailyStat.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date", timezone: analyticsTimezone } },
                    streams: { $sum: "$playCount" },
                    uniqueListeners: { $sum: "$uniqueListeners" },
                },
            },
            { $sort: { _id: 1 } },
        ]),
    ]);

    const streamsThisMonth = totalStreamsThisMonth[0]?.total ?? 0;
    const streamsAllTime = totalStreamsAllTime[0]?.total ?? 0;

    const rawMap = Object.fromEntries(last7DaysRaw.map((r) => [r._id, r]));
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const day = now.subtract(i, "day");
        const dateKey = day.format("YYYY-MM-DD");
        const found = rawMap[dateKey];
        last7Days.push({
            date: dateKey,
            streams: found?.streams ?? 0,
            uniqueUsers: found?.uniqueListeners ?? 0,
            totalListeningTime: 0,
        });
    }

    return {
        totalUsers,
        totalArtists,
        totalTracks,
        streamsThisMonth,
        streamsAllTime,
        topTracks: (monthlyStat?.dailyStats ?? []).length > 0
            ? (monthlyStat?.streamingStats?.trackStreams ?? 0)
            : 0,
        currentPeriod: {
            year: currentYear,
            month: currentMonth,
            label: now.format("MMMM YYYY"),
        },
        last7Days,
    };
};

export const getMonthlyOverview = async (year, month) => {
    const monthlyStat = await PlatformMonthlyStat.findOne({ year, month }).lean();

    if (!monthlyStat) {
        return {
            year,
            month,
            label: dayjs().year(year).month(month - 1).format("MMMM YYYY"),
            userStats: { newUsers: 0, totalUsers: 0 },
            artistStats: { totalArtists: 0 },
            streamingStats: { totalStreams: 0, trackStreams: 0, totalListeningTime: 0 },
            dailyStats: [],
        };
    }

    return {
        year: monthlyStat.year,
        month: monthlyStat.month,
        label: dayjs().year(monthlyStat.year).month(monthlyStat.month - 1).format("MMMM YYYY"),
        userStats: monthlyStat.userStats,
        artistStats: monthlyStat.artistStats,
        streamingStats: monthlyStat.streamingStats,
        dailyStats: monthlyStat.dailyStats,
    };
};

export const getDailyStats = async (date) => {
    const analyticsTimezone = getAnalyticsTimezone();
    const targetDay = dayjs(date).tz(analyticsTimezone).startOf("day");
    const nextDay = targetDay.add(1, "day");
    const dateKey = targetDay.format("YYYY-MM-DD");

    const [listenEvents, trackStats, totalUsers, totalStreams] = await Promise.all([
        ListenEvent.aggregate([
            {
                $match: {
                    listenedAt: { $gte: targetDay.toDate(), $lt: nextDay.toDate() },
                },
            },
            {
                $group: {
                    _id: null,
                    totalStreams: { $sum: 1 },
                    totalListeningTime: {
                        $sum: {
                            $cond: [
                                { $and: [{ $isNumber: "$listenedDuration" }, { $gte: ["$listenedDuration", 0] }] },
                                "$listenedDuration",
                                0,
                            ],
                        },
                    },
                    uniqueUsers: { $addToSet: "$userId" },
                },
            },
        ]),
        TrackDailyStat.find({ date: { $gte: targetDay.toDate(), $lt: nextDay.toDate() } })
            .sort({ playCount: -1 })
            .limit(10)
            .populate({
                path: "trackId",
                select: "_id title duration avatar",
                populate: { path: "artist_artistId", select: "_id name avatar" },
            })
            .lean(),
        User.countDocuments({ createdAt: { $gte: targetDay.toDate(), $lt: nextDay.toDate() } }),
        ListenEvent.countDocuments({ listenedAt: { $gte: targetDay.toDate(), $lt: nextDay.toDate() } }),
    ]);

    const eventStats = listenEvents[0] ?? { totalStreams: 0, totalListeningTime: 0, uniqueUsers: [] };

    return {
        date: dateKey,
        streams: eventStats.totalStreams,
        uniqueUsers: eventStats.uniqueUsers?.length ?? 0,
        totalListeningTime: eventStats.totalListeningTime,
        newUsersToday: totalUsers,
        topTracks: trackStats.map((stat) => ({
            trackId: stat.trackId?._id,
            title: stat.trackId?.title ?? "Unknown",
            avatar: stat.trackId?.avatar ?? null,
            artistName: stat.trackId?.artist_artistId?.name ?? "Unknown",
            playCount: stat.playCount,
            uniqueListeners: stat.uniqueListeners,
            skipCount: stat.skipCount,
        })),
    };
};

export const syncPlatformMonthlyStats = async (year, month) => {
    const analyticsTimezone = getAnalyticsTimezone();
    const { periodStart, periodEnd } = getDateRangeOfMonth(year, month);

    const [
        listenStats,
        newUsers,
        totalUsers,
        totalArtists,
    ] = await Promise.all([
        ListenEvent.aggregate([
            {
                $match: {
                    listenedAt: { $gte: periodStart, $lt: periodEnd },
                },
            },
            {
                $group: {
                    _id: {
                        date: {
                            $dateToString: { format: "%Y-%m-%d", date: "$listenedAt", timezone: analyticsTimezone },
                        },
                    },
                    totalStreams: { $sum: 1 },
                    uniqueUsers: { $addToSet: "$userId" },
                    totalListeningTime: {
                        $sum: {
                            $cond: [
                                { $and: [{ $isNumber: "$listenedDuration" }, { $gte: ["$listenedDuration", 0] }] },
                                "$listenedDuration",
                                0,
                            ],
                        },
                    },
                },
            },
            { $sort: { "_id.date": 1 } },
        ]),
        User.countDocuments({ createdAt: { $gte: periodStart, $lt: periodEnd } }),
        User.countDocuments({}),
        Artist.countDocuments({}),
    ]);

    const dailyStats = listenStats.map((day) => ({
        date: day._id.date,
        totalStreams: day.totalStreams,
        uniqueUsers: day.uniqueUsers?.length ?? 0,
        totalListeningTime: day.totalListeningTime,
    }));

    const totalStreams = dailyStats.reduce((sum, d) => sum + d.totalStreams, 0);
    const totalListeningTime = dailyStats.reduce((sum, d) => sum + d.totalListeningTime, 0);

    const monthlyStat = await PlatformMonthlyStat.findOneAndUpdate(
        { year, month },
        {
            $set: {
                periodStart,
                periodEnd,
                userStats: {
                    newUsers,
                    totalUsers,
                },
                artistStats: {
                    totalArtists,
                },
                streamingStats: {
                    totalStreams,
                    trackStreams: totalStreams,
                    totalListeningTime,
                },
                dailyStats,
            },
        },
        { upsert: true, new: true, lean: true }
    );

    return monthlyStat;
};

export default {
    getOverviewStats,
    getMonthlyOverview,
    getDailyStats,
    syncPlatformMonthlyStats,
};
