import dayjs from "dayjs";
import { StatusCodes } from "http-status-codes";
import Artist from "../../models/Artist.js";
import ArtistRevenueSummary from "../../models/ArtistRevenueSummary.js";
import TrackMonthlyStat from "../../models/TrackMonthlyStat.js";
import { AppError } from "../../utils/AppError.js";

const MONTH_CHART_LENGTH = 12;

const roundCurrency = (value) => Math.max(0, Math.round(Number(value) || 0));

const toId = (value) => {
    if (!value) {
        return null;
    }

    return value.toString();
};

const buildPeriodLabel = (year, month) =>
    `${String(month).padStart(2, "0")}/${year}`;

const resolveOwnedArtistProfile = async (userId) => {
    const artist = await Artist.findOne({ userId }).select("_id").lean();

    if (!artist) {
        throw new AppError(
            "Artist profile not found for this account.",
            StatusCodes.NOT_FOUND
        );
    }

    return artist;
};

const buildMonthSeries = ({ endYear, endMonth, length = MONTH_CHART_LENGTH }) => {
    const endDate = dayjs(`${endYear}-${String(endMonth).padStart(2, "0")}-01`);

    return Array.from({ length }, (_, index) => {
        const currentDate = endDate.subtract(length - index - 1, "month");

        return {
            year: currentDate.year(),
            month: currentDate.month() + 1,
            label: buildPeriodLabel(currentDate.year(), currentDate.month() + 1),
        };
    });
};

const buildSummaryPayload = (summary) => ({
    artistRevenueAmount: roundCurrency(summary?.artistRevenueAmount),
    totalEligibleStreams: Number(summary?.totalEligibleStreams || 0),
    status: summary?.status || null,
    calculatedAt: summary?.calculatedAt || null,
    confirmedAt: summary?.confirmedAt || null,
    updatedAt: summary?.updatedAt || null,
});

const buildLatestPeriodPayload = (summary) => {
    if (!summary) {
        return null;
    }

    return {
        year: Number(summary.year),
        month: Number(summary.month),
        label: buildPeriodLabel(summary.year, summary.month),
    };
};

const getLatestArtistRevenueDashboard = async (userId) => {
    const artist = await resolveOwnedArtistProfile(userId);

    const latestSummary = await ArtistRevenueSummary.findOne({
        artistId: artist._id,
    })
        .sort({ year: -1, month: -1, _id: -1 })
        .select(
            "year month artistRevenueAmount totalEligibleStreams status calculatedAt confirmedAt updatedAt"
        )
        .lean();

    if (!latestSummary) {
        return {
            latestPeriod: null,
            summary: null,
            revenueChart: [],
            trackRevenues: [],
        };
    }

    const monthSeries = buildMonthSeries({
        endYear: latestSummary.year,
        endMonth: latestSummary.month,
    });

    const monthConditions = monthSeries.map(({ year, month }) => ({ year, month }));

    const [chartSummaries, trackRevenues] = await Promise.all([
        ArtistRevenueSummary.find({
            artistId: artist._id,
            $or: monthConditions,
        })
            .sort({ year: 1, month: 1, _id: 1 })
            .select("year month artistRevenueAmount totalEligibleStreams status")
            .lean(),
        TrackMonthlyStat.aggregate([
            {
                $match: {
                    year: Number(latestSummary.year),
                    month: Number(latestSummary.month),
                },
            },
            {
                $lookup: {
                    from: "tracks",
                    localField: "trackId",
                    foreignField: "_id",
                    as: "track",
                },
            },
            {
                $unwind: "$track",
            },
            {
                $match: {
                    "track.artist_artistId": artist._id,
                },
            },
            {
                $addFields: {
                    artistRevenueAmount: {
                        $ifNull: ["$revenue.artistRevenueAmount", "$revenueAmount"],
                    },
                    eligibleStreams: {
                        $ifNull: ["$revenue.eligibleStreams", 0],
                    },
                },
            },
            {
                $match: {
                    $or: [
                        { artistRevenueAmount: { $gt: 0 } },
                        { eligibleStreams: { $gt: 0 } },
                    ],
                },
            },
            {
                $project: {
                    _id: 0,
                    trackId: "$track._id",
                    title: "$track.title",
                    avatar: "$track.avatar",
                    artistRevenueAmount: 1,
                    eligibleStreams: 1,
                    playCount: 1,
                },
            },
            {
                $sort: {
                    artistRevenueAmount: -1,
                    eligibleStreams: -1,
                    playCount: -1,
                    trackId: 1,
                },
            },
        ]),
    ]);

    const chartSummaryMap = new Map(
        chartSummaries.map((summary) => [
            `${summary.year}-${summary.month}`,
            summary,
        ])
    );

    return {
        latestPeriod: buildLatestPeriodPayload(latestSummary),
        summary: buildSummaryPayload(latestSummary),
        revenueChart: monthSeries.map(({ year, month, label }) => {
            const summary = chartSummaryMap.get(`${year}-${month}`);

            return {
                year,
                month,
                label,
                artistRevenueAmount: roundCurrency(summary?.artistRevenueAmount),
                totalEligibleStreams: Number(summary?.totalEligibleStreams || 0),
            };
        }),
        trackRevenues: trackRevenues.map((track) => ({
            trackId: toId(track.trackId),
            title: track.title || "",
            avatar: track.avatar || "",
            artistRevenueAmount: roundCurrency(track.artistRevenueAmount),
            eligibleStreams: Number(track.eligibleStreams || 0),
            playCount: Number(track.playCount || 0),
        })),
    };
};

export default {
    getLatestArtistRevenueDashboard,
};
