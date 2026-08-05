import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import Artist from "../../models/Artist.js";
import ArtistMonthlyStat from "../../models/ArtistMonthlyStat.js";
import ArtistRevenueSummary from "../../models/ArtistRevenueSummary.js";
import Interaction from "../../models/Interaction.js";
import ListenEvent from "../../models/ListenEvent.js";
import { getAnalyticsTimezone } from "./trackStatAggregation.service.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const resolveTargetMonth = (targetMonthInput) => {
    const analyticsTimezone = getAnalyticsTimezone();

    if (!targetMonthInput || targetMonthInput === "__previous_month__") {
        return dayjs().tz(analyticsTimezone).subtract(1, "month").startOf("month");
    }

    const targetMonth = dayjs.tz(targetMonthInput, analyticsTimezone).startOf("month");

    if (!targetMonth.isValid()) {
        throw new Error("Invalid artist monthly stat target month.");
    }

    return targetMonth;
};

const buildMonthlyStreamPipeline = ({ startDate, endDate }) => ([
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
            totalStreams: { $sum: 1 },
        },
    },
]);

const buildFollowerPipeline = ({ startDate, endDate } = {}) => {
    const match = {
        targetType: "Artist",
        action: "follow",
    };

    if (startDate && endDate) {
        match.createdAt = { $gte: startDate, $lt: endDate };
    }

    return [
        { $match: match },
        {
            $group: {
                _id: "$targetId",
                count: { $sum: 1 },
            },
        },
    ];
};

const toNumberMap = (documents, valueField, keyField = "_id") =>
    new Map(
        documents.map((document) => [
            String(document[keyField]),
            Number(document[valueField] || 0),
        ])
    );

const syncMonthlyStats = async ({ year, month, artistIds, stats }) => {
    if (artistIds.length === 0) {
        const deleteResult = await ArtistMonthlyStat.deleteMany({ year, month });

        return {
            matchedArtists: 0,
            deletedCount: deleteResult.deletedCount || 0,
            upsertedCount: 0,
        };
    }

    const bulkResult = await ArtistMonthlyStat.bulkWrite(
        artistIds.map((artistId) => {
            const artistStat = stats.get(String(artistId));

            return {
                updateOne: {
                    filter: { artistId, year, month },
                    update: {
                        $set: {
                            newFollowers: artistStat.newFollowers,
                            totalFollowers: artistStat.totalFollowers,
                            totalStreams: artistStat.totalStreams,
                            revenueAmount: artistStat.revenueAmount,
                        },
                    },
                    upsert: true,
                },
            };
        })
    );

    const deleteResult = await ArtistMonthlyStat.deleteMany({
        year,
        month,
        artistId: { $nin: artistIds },
    });

    return {
        matchedArtists: artistIds.length,
        deletedCount: deleteResult.deletedCount || 0,
        upsertedCount: bulkResult.upsertedCount || 0,
        modifiedCount: bulkResult.modifiedCount || 0,
    };
};

export const syncArtistMonthlyStatsForMonth = async (targetMonthInput) => {
    const analyticsTimezone = getAnalyticsTimezone();
    const targetMonth = resolveTargetMonth(targetMonthInput);
    const nextMonth = targetMonth.add(1, "month");
    const year = targetMonth.year();
    const month = targetMonth.month() + 1;
    const startDate = targetMonth.toDate();
    const endDate = nextMonth.toDate();

    const [artists, streamStats, newFollowerStats, totalFollowerStats, revenueStats] =
        await Promise.all([
            Artist.find({}).select("_id").lean(),
            ListenEvent.aggregate(
                buildMonthlyStreamPipeline({ startDate, endDate })
            ),
            Interaction.aggregate(
                buildFollowerPipeline({ startDate, endDate })
            ),
            Interaction.aggregate(buildFollowerPipeline()),
            ArtistRevenueSummary.find({ year, month })
                .select("artistId artistRevenueAmount")
                .lean(),
        ]);

    const artistIds = artists.map((artist) => artist._id);
    const streamsByArtist = toNumberMap(streamStats, "totalStreams");
    const newFollowersByArtist = toNumberMap(newFollowerStats, "count");
    const totalFollowersByArtist = toNumberMap(totalFollowerStats, "count");
    const revenueByArtist = toNumberMap(
        revenueStats,
        "artistRevenueAmount",
        "artistId"
    );
    const stats = new Map(
        artistIds.map((artistId) => {
            const key = String(artistId);

            return [
                key,
                {
                    newFollowers: newFollowersByArtist.get(key) || 0,
                    totalFollowers: totalFollowersByArtist.get(key) || 0,
                    totalStreams: streamsByArtist.get(key) || 0,
                    revenueAmount: revenueByArtist.get(key) || 0,
                },
            ];
        })
    );

    const monthlyResult = await syncMonthlyStats({
        year,
        month,
        artistIds,
        stats,
    });

    return {
        timezone: analyticsTimezone,
        targetMonth: targetMonth.format("YYYY-MM"),
        monthly: monthlyResult,
    };
};

export default {
    syncArtistMonthlyStatsForMonth,
};
