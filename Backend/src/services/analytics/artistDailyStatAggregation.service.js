import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import Artist from "../../models/Artist.js";
import ListenEvent from "../../models/ListenEvent.js";
import ArtistDailyRanking from "../../models/ArtistDailyRanking.js";
import { getAnalyticsTimezone } from "./trackStatAggregation.service.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const DAILY_TOP_ARTISTS_LIMIT = 20;

const buildDailyArtistAggregationPipeline = ({ startDate, endDate }) => ([
    {
        $match: {
            artistId: { $exists: true, $ne: null },
            listenedAt: { $gte: startDate, $lt: endDate },
        },
    },
    {
        $group: {
            _id: "$artistId",
            playCount: { $sum: 1 },
            uniqueListeners: { $addToSet: "$userId" },
            totalTracksPlayed: { $addToSet: "$trackId" },
            completedPlayCount: {
                $sum: {
                    $cond: [{ $eq: ["$completed", true] }, 1, 0],
                },
            },
        },
    },
    {
        $project: {
            _id: 0,
            artistId: "$_id",
            playCount: 1,
            uniqueListeners: { $size: "$uniqueListeners" },
            completedPlayCount: 1,
            totalTracksPlayed: {
                $size: {
                    $filter: {
                        input: "$totalTracksPlayed",
                        as: "trackId",
                        cond: { $ne: ["$$trackId", null] },
                    },
                },
            },
            score: {
                $add: [
                    { $multiply: [{ $size: "$uniqueListeners" }, 5] },
                    "$completedPlayCount",
                    { $multiply: ["$playCount", 0.5] },
                ],
            },
        },
    },
]);

const buildTopRankings = (dailyStats) =>
    [...dailyStats]
        .sort((left, right) => {
            if (right.score !== left.score) {
                return right.score - left.score;
            }

            if (right.uniqueListeners !== left.uniqueListeners) {
                return right.uniqueListeners - left.uniqueListeners;
            }

            if (right.playCount !== left.playCount) {
                return right.playCount - left.playCount;
            }

            return String(left.artistId).localeCompare(String(right.artistId));
        })
        .slice(0, DAILY_TOP_ARTISTS_LIMIT)
        .map((stat, index) => ({
            artistId: stat.artistId,
            playCount: stat.playCount,
            uniqueListeners: stat.uniqueListeners,
            completedPlayCount: stat.completedPlayCount,
            totalTracksPlayed: stat.totalTracksPlayed,
            score: stat.score,
            rank: index + 1,
        }));

const fillMissingRankings = async (rankings) => {
    if (rankings.length >= DAILY_TOP_ARTISTS_LIMIT) {
        return rankings;
    }

    const existingArtistIds = rankings.map((ranking) => ranking.artistId);
    const fillerArtists = await Artist.find({
        _id: { $nin: existingArtistIds },
        activeStatus: "active",
    })
        .sort({ "stats.totalStreams": -1, "stats.followers": -1, _id: 1 })
        .limit(DAILY_TOP_ARTISTS_LIMIT - rankings.length)
        .select("_id")
        .lean();

    const fillerRankings = fillerArtists.map((artist) => ({
        artistId: artist._id,
        playCount: 0,
        uniqueListeners: 0,
        completedPlayCount: 0,
        totalTracksPlayed: 0,
        score: 0,
        rank: 0,
    }));

    return [...rankings, ...fillerRankings].map((ranking, index) => ({
        ...ranking,
        rank: index + 1,
    }));
};

const syncDailyArtistStats = async ({ date, nextDate, dailyStats }) => {
    const baseRankings = buildTopRankings(dailyStats);
    const rankings = await fillMissingRankings(baseRankings);

    if (rankings.length === 0) {
        const deleteResult = await ArtistDailyRanking.deleteMany({
            date: { $gte: date, $lt: nextDate },
        });

        return {
            matchedArtists: 0,
            deletedCount: deleteResult.deletedCount || 0,
            upsertedCount: 0,
        };
    }

    const deleteResult = await ArtistDailyRanking.deleteMany({
        date: { $gte: date, $lt: nextDate },
    });

    await ArtistDailyRanking.create({
        date,
        rankings,
    });

    return {
        matchedArtists: dailyStats.length,
        storedArtists: rankings.length,
        fillerArtists: Math.max(0, rankings.length - baseRankings.length),
        deletedCount: deleteResult.deletedCount || 0,
        upsertedCount: 1,
    };
};

export const syncArtistDailyStatsForDay = async (targetDateInput) => {
    const analyticsTimezone = getAnalyticsTimezone();
    const targetDay = targetDateInput
        ? dayjs(targetDateInput).tz(analyticsTimezone).startOf("day")
        : dayjs().tz(analyticsTimezone).subtract(1, "day").startOf("day");

    const nextDay = targetDay.add(1, "day");
    const date = targetDay.toDate();
    const dailyStats = await ListenEvent.aggregate(
        buildDailyArtistAggregationPipeline({
            startDate: targetDay.toDate(),
            endDate: nextDay.toDate(),
        })
    );

    const dailyResult = await syncDailyArtistStats({
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

export { getAnalyticsTimezone };

export default {
    syncArtistDailyStatsForDay,
    getAnalyticsTimezone,
};
