import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import Artist from "../../models/Artist.js";
import ArtistMonthlyRanking from "../../models/ArtistMonthlyRanking.js";
import ListenEvent from "../../models/ListenEvent.js";
import { getAnalyticsTimezone } from "./trackStatAggregation.service.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const MONTHLY_TOP_ARTISTS_LIMIT = 20;

const buildMonthlyArtistAggregationPipeline = ({ startDate, endDate }) => ([
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

const buildTopRankings = (monthlyStats) =>
    [...monthlyStats]
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
        .slice(0, MONTHLY_TOP_ARTISTS_LIMIT)
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
    if (rankings.length >= MONTHLY_TOP_ARTISTS_LIMIT) {
        return rankings;
    }

    const existingArtistIds = rankings.map((ranking) => ranking.artistId);
    const fillerArtists = await Artist.find({
        _id: { $nin: existingArtistIds },
        activeStatus: "active",
    })
        .sort({ "stats.totalStreams": -1, "stats.followers": -1, _id: 1 })
        .limit(MONTHLY_TOP_ARTISTS_LIMIT - rankings.length)
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

const syncMonthlyArtistRankings = async ({ year, month, monthlyStats }) => {
    const baseRankings = buildTopRankings(monthlyStats);
    const rankings = await fillMissingRankings(baseRankings);

    if (rankings.length === 0) {
        const deleteResult = await ArtistMonthlyRanking.deleteMany({ year, month });

        return {
            matchedArtists: 0,
            deletedCount: deleteResult.deletedCount || 0,
            upsertedCount: 0,
        };
    }

    const deleteResult = await ArtistMonthlyRanking.deleteMany({ year, month });

    await ArtistMonthlyRanking.create({
        year,
        month,
        rankings,
    });

    return {
        matchedArtists: monthlyStats.length,
        storedArtists: rankings.length,
        fillerArtists: Math.max(0, rankings.length - baseRankings.length),
        deletedCount: deleteResult.deletedCount || 0,
        upsertedCount: 1,
    };
};

export const syncArtistMonthlyRankingsForMonth = async (targetMonthInput) => {
    const analyticsTimezone = getAnalyticsTimezone();
    const targetMonth = targetMonthInput
        ? dayjs(targetMonthInput).tz(analyticsTimezone).startOf("month")
        : dayjs().tz(analyticsTimezone).subtract(1, "month").startOf("month");

    const nextMonth = targetMonth.add(1, "month");
    const monthlyStats = await ListenEvent.aggregate(
        buildMonthlyArtistAggregationPipeline({
            startDate: targetMonth.toDate(),
            endDate: nextMonth.toDate(),
        })
    );

    const monthlyResult = await syncMonthlyArtistRankings({
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

export { getAnalyticsTimezone };

export default {
    syncArtistMonthlyRankingsForMonth,
    getAnalyticsTimezone,
};
