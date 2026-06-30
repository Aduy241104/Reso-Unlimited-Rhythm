import dayjs from "dayjs";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import Artist from "../../models/Artist.js";
import ArtistRevenueSummary from "../../models/ArtistRevenueSummary.js";
import RevenuePeriod from "../../models/RevenuePeriod.js";
import TrackMonthlyStat from "../../models/TrackMonthlyStat.js";
import { normalizePositiveInteger } from "../Playlist/playlist.helper.js";
import { AppError } from "../../utils/AppError.js";
import {
    ARTIST_REVENUE_SHARE_PERCENT,
    ARTIST_REVENUE_SHARE_RATIO,
} from "../../helpers/revenuePeriod.helper.js";

const MONTH_CHART_LENGTH = 12;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const roundCurrency = (value) => Math.max(0, Math.round(Number(value) || 0));

const toId = (value) => {
    if (!value) {
        return null;
    }

    return value.toString();
};

const buildPeriodLabel = (year, month) =>
    `${String(month).padStart(2, "0")}/${year}`;

const resolveTrackArtistRevenueAmount = (track = {}) =>
    roundCurrency(
        track.artistRevenueAmount ||
            track.revenueAmount ||
            track.legacyRevenueAmount
    );

const resolveTrackGrossRevenueAmount = (track = {}) => {
    const artistRevenueAmount = resolveTrackArtistRevenueAmount(track);

    if (artistRevenueAmount <= 0 || ARTIST_REVENUE_SHARE_RATIO <= 0) {
        return 0;
    }

    return roundCurrency(artistRevenueAmount / ARTIST_REVENUE_SHARE_RATIO);
};

const resolveTrackPlatformRevenueAmount = (track = {}) => {
    const grossRevenueAmount = resolveTrackGrossRevenueAmount(track);
    const artistRevenueAmount = resolveTrackArtistRevenueAmount(track);

    return roundCurrency(grossRevenueAmount - artistRevenueAmount);
};

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

const ensureArtistRevenueSummaryId = (artistRevenueSummaryId) => {
    if (!mongoose.Types.ObjectId.isValid(artistRevenueSummaryId)) {
        throw new AppError("Artist revenue summary id is invalid.", 400, {
            field: "id",
        });
    }
};

const buildTrackRevenueAggregationPipeline = ({
    artistId,
    year,
    month,
    groupByPeriod = false,
}) => {
    const pipeline = [
        {
            $match: {
                year: Number(year),
                month: Number(month),
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
                "track.artist_artistId": artistId,
            },
        },
        {
            $addFields: {
                artistRevenueAmount: {
                    $ifNull: [
                        "$revenue.artistRevenueAmount",
                        {
                            $ifNull: ["$revenue.revenueAmount", "$revenueAmount"],
                        },
                    ],
                },
                revenueAmount: {
                    $ifNull: ["$revenue.revenueAmount", "$revenueAmount"],
                },
                eligibleStreams: {
                    $ifNull: ["$revenue.eligibleStreams", 0],
                },
                revenueCalculatedAt: {
                    $ifNull: ["$revenue.calculatedAt", null],
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
    ];

    if (groupByPeriod) {
        pipeline.push({
            $group: {
                _id: {
                    year: "$year",
                    month: "$month",
                },
                trackCount: { $sum: 1 },
                totalTrackRevenueAmount: { $sum: "$artistRevenueAmount" },
            },
        });

        return pipeline;
    }

    pipeline.push(
        {
            $project: {
                _id: 0,
                trackId: "$track._id",
                title: "$track.title",
                avatar: "$track.avatar",
                releaseDate: "$track.releaseDate",
                activeStatus: "$track.activeStatus",
                approvalStatus: "$track.approvalStatus",
                artistRevenueAmount: 1,
                revenueAmount: 1,
                legacyRevenueAmount: "$revenueAmount",
                eligibleStreams: 1,
                revenueCalculatedAt: 1,
                playCount: 1,
                uniqueListeners: 1,
            },
        },
        {
            $sort: {
                artistRevenueAmount: -1,
                eligibleStreams: -1,
                playCount: -1,
                trackId: 1,
            },
        }
    );

    return pipeline;
};

const findArtistTrackRevenuesByPeriod = async ({ artistId, year, month }) =>
    TrackMonthlyStat.aggregate(
        buildTrackRevenueAggregationPipeline({
            artistId,
            year,
            month,
        })
    );

const findArtistTrackRevenueCountsByPeriods = async ({ artistId, periods }) => {
    if (!periods.length) {
        return [];
    }

    return TrackMonthlyStat.aggregate([
        {
            $match: {
                $or: periods.map(({ year, month }) => ({
                    year: Number(year),
                    month: Number(month),
                })),
            },
        },
        ...buildTrackRevenueAggregationPipeline({
            artistId,
            year: periods[0].year,
            month: periods[0].month,
            groupByPeriod: true,
        }).slice(1),
    ]);
};

const buildArtistRevenuePeriodPayload = (summary, revenuePeriod = null) => ({
    id: toId(revenuePeriod?._id),
    revenueSummaryId: toId(summary?._id),
    year: Number(summary?.year),
    month: Number(summary?.month),
    label: buildPeriodLabel(summary?.year, summary?.month),
    status: revenuePeriod?.status || summary?.status || null,
    periodStart: revenuePeriod?.periodStart || null,
    periodEnd: revenuePeriod?.periodEnd || null,
});

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
        findArtistTrackRevenuesByPeriod({
            artistId: artist._id,
            year: latestSummary.year,
            month: latestSummary.month,
        }),
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

const getArtistRevenuePeriods = async (userId, query = {}) => {
    const artist = await resolveOwnedArtistProfile(userId);
    const page = normalizePositiveInteger(query.page, DEFAULT_PAGE);
    const requestedLimit = normalizePositiveInteger(query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;

    const filter = {
        artistId: artist._id,
    };

    if (query.status) {
        filter.status = query.status;
    }

    if (typeof query.year !== "undefined") {
        filter.year = Number(query.year);
    }

    if (typeof query.month !== "undefined") {
        filter.month = Number(query.month);
    }

    const [total, revenueSummaries] = await Promise.all([
        ArtistRevenueSummary.countDocuments(filter),
        ArtistRevenueSummary.find(filter)
            .sort({ year: -1, month: -1, _id: -1 })
            .skip(skip)
            .limit(limit)
            .select(
                "year month artistRevenueAmount totalEligibleStreams status calculatedAt confirmedAt updatedAt"
            )
            .lean(),
    ]);

    if (!revenueSummaries.length) {
        return {
            revenuePeriods: [],
            pagination: {
                page,
                limit,
                total,
                totalPages: total === 0 ? 0 : Math.ceil(total / limit),
            },
        };
    }

    const periodFilters = revenueSummaries.map((summary) => ({
        year: Number(summary.year),
        month: Number(summary.month),
    }));

    const [revenuePeriods, trackStats] = await Promise.all([
        RevenuePeriod.find({
            $or: periodFilters,
        })
            .select("_id year month status periodStart periodEnd")
            .lean(),
        findArtistTrackRevenueCountsByPeriods({
            artistId: artist._id,
            periods: periodFilters,
        }),
    ]);

    const revenuePeriodMap = new Map(
        revenuePeriods.map((revenuePeriod) => [
            `${revenuePeriod.year}-${revenuePeriod.month}`,
            revenuePeriod,
        ])
    );
    const trackStatsMap = new Map(
        trackStats.map((trackStat) => [
            `${trackStat._id.year}-${trackStat._id.month}`,
            trackStat,
        ])
    );

    return {
        revenuePeriods: revenueSummaries.map((summary) => {
            const periodKey = `${summary.year}-${summary.month}`;
            const revenuePeriod = revenuePeriodMap.get(periodKey) || null;
            const periodTrackStats = trackStatsMap.get(periodKey);

            return {
                id: toId(revenuePeriod?._id || summary._id),
                revenueSummaryId: toId(summary._id),
                period: buildArtistRevenuePeriodPayload(summary, revenuePeriod),
                summary: buildSummaryPayload(summary),
                trackCount: Number(periodTrackStats?.trackCount || 0),
                totalTrackRevenueAmount: roundCurrency(
                    periodTrackStats?.totalTrackRevenueAmount
                ),
            };
        }),
        pagination: {
            page,
            limit,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
    };
};

const getArtistRevenuePeriodDetail = async (userId, artistRevenueSummaryId) => {
    const artist = await resolveOwnedArtistProfile(userId);

    ensureArtistRevenueSummaryId(artistRevenueSummaryId);

    const [summaryById, revenuePeriodById] = await Promise.all([
        ArtistRevenueSummary.findOne({
            _id: artistRevenueSummaryId,
            artistId: artist._id,
        })
            .select(
                "year month artistRevenueAmount totalEligibleStreams status calculatedAt confirmedAt updatedAt"
            )
            .lean(),
        RevenuePeriod.findById(artistRevenueSummaryId)
            .select("_id year month status periodStart periodEnd")
            .lean(),
    ]);

    let artistRevenueSummary = summaryById;
    let revenuePeriod = revenuePeriodById;

    if (!artistRevenueSummary && revenuePeriod) {
        artistRevenueSummary = await ArtistRevenueSummary.findOne({
            artistId: artist._id,
            year: Number(revenuePeriod.year),
            month: Number(revenuePeriod.month),
        })
            .select(
                "year month artistRevenueAmount totalEligibleStreams status calculatedAt confirmedAt updatedAt"
            )
            .lean();
    }

    if (!artistRevenueSummary) {
        throw new AppError("Artist revenue period not found.", 404, {
            field: "id",
        });
    }

    const trackRevenues = await findArtistTrackRevenuesByPeriod({
        artistId: artist._id,
        year: artistRevenueSummary.year,
        month: artistRevenueSummary.month,
    });

    if (!revenuePeriod) {
        revenuePeriod = await RevenuePeriod.findOne({
            year: Number(artistRevenueSummary.year),
            month: Number(artistRevenueSummary.month),
        })
            .select("_id year month status periodStart periodEnd")
            .lean();
    }

    return {
        period: buildArtistRevenuePeriodPayload(
            artistRevenueSummary,
            revenuePeriod
        ),
        summary: buildSummaryPayload(artistRevenueSummary),
        totals: {
            trackCount: trackRevenues.length,
            totalTrackRevenueAmount: roundCurrency(
                trackRevenues.reduce(
                    (totalAmount, track) =>
                        totalAmount + Number(track.artistRevenueAmount || 0),
                    0
                )
            ),
            totalEligibleStreams: trackRevenues.reduce(
                (totalStreams, track) =>
                    totalStreams + Number(track.eligibleStreams || 0),
                0
            ),
        },
        trackRevenues: trackRevenues.map((track) => ({
            trackId: toId(track.trackId),
            title: track.title || "",
            avatar: track.avatar || "",
            releaseDate: track.releaseDate || null,
            activeStatus: track.activeStatus || null,
            approvalStatus: track.approvalStatus || null,
            artistRevenueAmount: resolveTrackArtistRevenueAmount(track),
            grossRevenueAmount: resolveTrackGrossRevenueAmount(track),
            platformRevenueAmount: resolveTrackPlatformRevenueAmount(track),
            revenueSharePercent:
                track.artistRevenueAmount ||
                track.revenueAmount ||
                track.legacyRevenueAmount
                    ? ARTIST_REVENUE_SHARE_PERCENT
                    : 0,
            eligibleStreams: Number(track.eligibleStreams || 0),
            playCount: Number(track.playCount || 0),
            uniqueListeners: Number(track.uniqueListeners || 0),
            calculatedAt: track.revenueCalculatedAt || null,
        })),
    };
};

export default {
    getLatestArtistRevenueDashboard,
    getArtistRevenuePeriods,
    getArtistRevenuePeriodDetail,
};
