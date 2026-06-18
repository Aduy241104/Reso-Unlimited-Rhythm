import mongoose from "mongoose";
import ArtistRevenueSummary from "../../models/ArtistRevenueSummary.js";
import RevenuePeriod from "../../models/RevenuePeriod.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { normalizePositiveInteger } from "../Playlist/playlist.helper.js";
import { AppError } from "../../utils/AppError.js";
import { runRevenueAggregation } from "../../jobs/revenueAggregation.cron.js";
import {
    ARTIST_REVENUE_SHARE_PERCENT,
    PLATFORM_REVENUE_SHARE_PERCENT,
    buildRevenuePeriodRange,
    normalizeRevenueDashboardPeriod,
    resolveRevenuePeriodStatus,
} from "../../helpers/revenuePeriod.helper.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const OFFICIAL_ARTIST_REVENUE_STATUSES = ["calculated", "paid"];
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const readAggregateNumber = (aggregationResult, fieldName) =>
    Number(aggregationResult?.[0]?.[fieldName] || 0);

const readRevenuePeriodNumber = (revenuePeriod, fieldName) =>
    Number(revenuePeriod?.[fieldName] || 0);

const toId = (value) => {
    if (!value) {
        return null;
    }

    return value.toString();
};

const calculateArtistPool = (premiumRevenue) =>
    Math.round((Number(premiumRevenue) || 0) * (ARTIST_REVENUE_SHARE_PERCENT / 100));

const buildRevenuePeriodLabel = (year, month) =>
    `${String(month).padStart(2, "0")}/${year}`;

const resolveLastUpdatedAt = (...dates) => {
    const latestTimestamp = dates
        .filter(Boolean)
        .map((value) => new Date(value).getTime())
        .reduce((maxTimestamp, value) => Math.max(maxTimestamp, value), 0);

    return latestTimestamp > 0 ? new Date(latestTimestamp).toISOString() : null;
};

const isPastRevenuePeriod = ({
    year,
    month,
    currentYear,
    currentMonth,
}) => {
    if (year < currentYear) {
        return true;
    }

    return year === currentYear && month < currentMonth;
};

const formatRevenuePeriodSummary = (revenuePeriod) => ({
    premiumRevenue: readRevenuePeriodNumber(revenuePeriod, "totalPremiumRevenue"),
    artistPool: readRevenuePeriodNumber(revenuePeriod, "totalArtistPool"),
    platformRevenue: readRevenuePeriodNumber(revenuePeriod, "totalPlatformRevenue"),
    totalEligibleStreams: readRevenuePeriodNumber(
        revenuePeriod,
        "totalEligibleStreams"
    ),
    successfulTransactions: readRevenuePeriodNumber(
        revenuePeriod,
        "successfulTransactions"
    ),
});

const formatRevenuePeriodTimestamps = (revenuePeriod) => ({
    lastAggregatedAt: revenuePeriod.lastAggregatedAt || null,
    closedAt: revenuePeriod.closedAt || null,
    calculatedAt: revenuePeriod.calculatedAt || null,
    confirmedAt: revenuePeriod.confirmedAt || null,
    createdAt: revenuePeriod.createdAt || null,
    updatedAt: revenuePeriod.updatedAt || null,
});

const formatRevenuePeriodListItem = (revenuePeriod, distributionStats = {}) => ({
    id: toId(revenuePeriod._id),
    year: revenuePeriod.year,
    month: revenuePeriod.month,
    label: buildRevenuePeriodLabel(revenuePeriod.year, revenuePeriod.month),
    status: revenuePeriod.status,
    periodStart: revenuePeriod.periodStart,
    periodEnd: revenuePeriod.periodEnd,
    summary: formatRevenuePeriodSummary(revenuePeriod),
    distribution: {
        distributedArtistCount: Number(distributionStats.distributedArtistCount || 0),
        distributedArtistRevenueAmount: Number(
            distributionStats.distributedArtistRevenueAmount || 0
        ),
    },
    timestamps: formatRevenuePeriodTimestamps(revenuePeriod),
});

const formatDistributedArtistItem = (artistRevenueSummary) => ({
    artistId: toId(artistRevenueSummary.artistId?._id || artistRevenueSummary.artistId),
    artist: artistRevenueSummary.artistId
        ? {
            id: toId(artistRevenueSummary.artistId._id || artistRevenueSummary.artistId),
            name: artistRevenueSummary.artistId.name || "",
            avatar: artistRevenueSummary.artistId.avatar || "",
            verificationStatus:
                  artistRevenueSummary.artistId.verificationStatus || "pending",
            activeStatus: artistRevenueSummary.artistId.activeStatus || "active",
        }
        : null,
    totalEligibleStreams: Number(artistRevenueSummary.totalEligibleStreams || 0),
    grossRevenueAmount: Number(artistRevenueSummary.grossRevenueAmount || 0),
    artistRevenueAmount: Number(artistRevenueSummary.artistRevenueAmount || 0),
    platformRevenueAmount: Number(artistRevenueSummary.platformRevenueAmount || 0),
    withdrawnAmount: Number(artistRevenueSummary.withdrawnAmount || 0),
    availableAmount: Number(artistRevenueSummary.availableAmount || 0),
    status: artistRevenueSummary.status,
    calculatedAt: artistRevenueSummary.calculatedAt || null,
});

const buildRevenueMonthlyChart = ({ year, currentMonth, timezoneName, revenuePeriods }) => {
    const monthMap = new Map(
        revenuePeriods.map((item) => [
            `${item.year}-${String(item.month).padStart(2, "0")}`,
            item,
        ])
    );

    const months = [];
    for (let month = 1; month <= currentMonth; month += 1) {
        const monthKey = `${year}-${String(month).padStart(2, "0")}`;
        const revenuePeriod = monthMap.get(monthKey);
        const premiumRevenue = readRevenuePeriodNumber(
            revenuePeriod,
            "totalPremiumRevenue"
        );
        const artistPool = revenuePeriod
            ? readRevenuePeriodNumber(revenuePeriod, "totalArtistPool")
            : calculateArtistPool(premiumRevenue);
        const platformRevenue = revenuePeriod
            ? readRevenuePeriodNumber(revenuePeriod, "totalPlatformRevenue")
            : premiumRevenue - artistPool;

        months.push({
            year,
            month,
            label: dayjs()
                .tz(timezoneName)
                .year(year)
                .month(month - 1)
                .format("MMM YYYY"),
            premiumRevenue,
            artistPool,
            platformRevenue,
            successfulTransactions: readRevenuePeriodNumber(
                revenuePeriod,
                "successfulTransactions"
            ),
        });
    }

    return months;
};

const buildRevenueDailyChart = ({
    startDay,
    endDay,
    timezoneName,
    revenuePeriods,
}) => {
    const dayMap = new Map();

    revenuePeriods.forEach((revenuePeriod) => {
        (revenuePeriod.dailyStats || []).forEach((dailyStat) => {
            const dayKey = dayjs(dailyStat.date).tz(timezoneName).format("YYYY-MM-DD");
            dayMap.set(dayKey, dailyStat);
        });
    });

    const days = [];
    let cursor = startDay.clone();
    while (cursor.valueOf() <= endDay.valueOf()) {
        const dayKey = cursor.format("YYYY-MM-DD");
        const stat = dayMap.get(dayKey);
        const premiumRevenue = readRevenuePeriodNumber(stat, "premiumRevenue");
        const artistPool = stat
            ? readRevenuePeriodNumber(stat, "artistPool")
            : calculateArtistPool(premiumRevenue);
        const platformRevenue = stat
            ? readRevenuePeriodNumber(stat, "platformRevenue")
            : premiumRevenue - artistPool;

        days.push({
            date: dayKey,
            label: cursor.format("DD MMM"),
            premiumRevenue,
            artistPool,
            platformRevenue,
            successfulTransactions: readRevenuePeriodNumber(
                stat,
                "successfulTransactions"
            ),
        });

        cursor = cursor.add(1, "day");
    }

    return days;
};

const getRevenueDashboard = async (query = {}) => {
    const {
        year,
        month,
        currentYear,
        currentMonth,
        timezone,
    } = normalizeRevenueDashboardPeriod(query);

    const { periodStart, periodEnd } = buildRevenuePeriodRange(year, month, timezone);
    const endDay = dayjs().tz(timezone).endOf("day");
    const startDay = endDay.subtract(13, "day").startOf("day");

    const [
        revenuePeriod,
        currentYearRevenuePeriods,
        dailyChartRevenuePeriods,
        totalArtistPoolSummary,
        distributedArtistRevenueSummary,
        latestRevenuePeriod,
        latestArtistRevenueSummary,
    ] = await Promise.all([
        RevenuePeriod.findOne({ year, month }).lean(),
        RevenuePeriod.find({
            year: currentYear,
            month: { $gte: 1, $lte: currentMonth },
        })
            .sort({ month: 1 })
            .lean(),
        RevenuePeriod.find({
            periodStart: { $lt: endDay.add(1, "millisecond").toDate() },
            periodEnd: { $gt: startDay.toDate() },
        }).lean(),
        RevenuePeriod.aggregate([
            {
                $group: {
                    _id: null,
                    totalArtistPoolAllTime: { $sum: "$totalArtistPool" },
                },
            },
        ]),
        ArtistRevenueSummary.aggregate([
            {
                $match: {
                    status: { $in: OFFICIAL_ARTIST_REVENUE_STATUSES },
                },
            },
            {
                $group: {
                    _id: null,
                    distributedArtistRevenueAmount: { $sum: "$artistRevenueAmount" },
                },
            },
        ]),
        RevenuePeriod.findOne()
            .sort({ updatedAt: -1 })
            .select("updatedAt lastAggregatedAt")
            .lean(),
        ArtistRevenueSummary.findOne({
            status: { $in: OFFICIAL_ARTIST_REVENUE_STATUSES },
        })
            .sort({ updatedAt: -1 })
            .select("updatedAt")
            .lean(),
    ]);

    const premiumRevenue = readRevenuePeriodNumber(
        revenuePeriod,
        "totalPremiumRevenue"
    );
    const successfulTransactions = readRevenuePeriodNumber(
        revenuePeriod,
        "successfulTransactions"
    );
    const artistPool = revenuePeriod
        ? readRevenuePeriodNumber(revenuePeriod, "totalArtistPool")
        : calculateArtistPool(premiumRevenue);
    const platformRevenue = revenuePeriod
        ? readRevenuePeriodNumber(revenuePeriod, "totalPlatformRevenue")
        : premiumRevenue - artistPool;
    const totalArtistPoolAllTime = readAggregateNumber(
        totalArtistPoolSummary,
        "totalArtistPoolAllTime"
    );
    const distributedArtistRevenueAmount = readAggregateNumber(
        distributedArtistRevenueSummary,
        "distributedArtistRevenueAmount"
    );
    const undistributedArtistBalance = Math.max(
        totalArtistPoolAllTime - distributedArtistRevenueAmount,
        0
    );
    const revenueChart = {
        monthly: buildRevenueMonthlyChart({
            year: currentYear,
            currentMonth,
            timezoneName: timezone,
            revenuePeriods: currentYearRevenuePeriods,
        }),
        last14Days: buildRevenueDailyChart({
            startDay,
            endDay,
            timezoneName: timezone,
            revenuePeriods: dailyChartRevenuePeriods,
        }),
    };

    return {
        period: {
            year,
            month,
            periodStart: revenuePeriod?.periodStart || periodStart,
            periodEnd: revenuePeriod?.periodEnd || periodEnd,
            status: resolveRevenuePeriodStatus({
                revenuePeriodStatus: revenuePeriod?.status,
                selectedYear: year,
                selectedMonth: month,
                currentYear,
                currentMonth,
            }),
        },
        summary: {
            premiumRevenue,
            artistPool,
            platformRevenue,
            successfulTransactions,
            undistributedArtistBalance,
        },
        charts: revenueChart,
        metadata: {
            revenueSharePercent: {
                artist: ARTIST_REVENUE_SHARE_PERCENT,
                platform: PLATFORM_REVENUE_SHARE_PERCENT,
            },
            lastUpdatedAt: resolveLastUpdatedAt(
                revenuePeriod?.lastAggregatedAt || revenuePeriod?.updatedAt,
                latestRevenuePeriod?.lastAggregatedAt || latestRevenuePeriod?.updatedAt,
                latestArtistRevenueSummary?.updatedAt
            ),
        },
    };
};

const getRevenuePeriods = async (query = {}) => {
    const page = normalizePositiveInteger(query.page, DEFAULT_PAGE);
    const requestedLimit = normalizePositiveInteger(query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;
    const { currentYear, currentMonth } = normalizeRevenueDashboardPeriod();

    const filter = {
        $or: [
            { year: { $lt: currentYear } },
            { year: currentYear, month: { $lt: currentMonth } },
        ],
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

    const [revenuePeriods, total] = await Promise.all([
        RevenuePeriod.find(filter)
            .sort({ year: -1, month: -1, _id: 1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        RevenuePeriod.countDocuments(filter),
    ]);

    const periodFilters = revenuePeriods.map((revenuePeriod) => ({
        year: revenuePeriod.year,
        month: revenuePeriod.month,
    }));

    const distributionStats =
        periodFilters.length > 0
            ? await ArtistRevenueSummary.aggregate([
                {
                    $match: {
                        artistRevenueAmount: { $gt: 0 },
                        status: { $in: OFFICIAL_ARTIST_REVENUE_STATUSES },
                        $or: periodFilters,
                    },
                },
                {
                    $group: {
                        _id: { year: "$year", month: "$month" },
                        distributedArtistCount: { $sum: 1 },
                        distributedArtistRevenueAmount: {
                            $sum: "$artistRevenueAmount",
                        },
                    },
                },
            ])
            : [];

    const distributionMap = new Map(
        distributionStats.map((item) => [
            `${item._id.year}-${item._id.month}`,
            {
                distributedArtistCount: Number(item.distributedArtistCount || 0),
                distributedArtistRevenueAmount: Number(
                    item.distributedArtistRevenueAmount || 0
                ),
            },
        ])
    );

    return {
        revenuePeriods: revenuePeriods.map((revenuePeriod) =>
            formatRevenuePeriodListItem(
                revenuePeriod,
                distributionMap.get(`${revenuePeriod.year}-${revenuePeriod.month}`)
            )
        ),
        pagination: {
            page,
            limit,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
    };
};

const getRevenuePeriodDetail = async (revenuePeriodId) => {
    if (!mongoose.Types.ObjectId.isValid(revenuePeriodId)) {
        throw new AppError("Revenue period id is invalid.", 400, { field: "id" });
    }

    const { currentYear, currentMonth } = normalizeRevenueDashboardPeriod();

    const revenuePeriod = await RevenuePeriod.findById(revenuePeriodId)
        .populate("confirmedBy", "email profile.fullName")
        .lean();

    if (!revenuePeriod) {
        throw new AppError("Revenue period not found.", 404, { field: "id" });
    }

    if (
        !isPastRevenuePeriod({
            year: revenuePeriod.year,
            month: revenuePeriod.month,
            currentYear,
            currentMonth,
        })
    ) {
        throw new AppError(
            "This endpoint only supports past revenue periods.",
            400,
            { field: "id" }
        );
    }

    const artistRevenueSummaries = await ArtistRevenueSummary.find({
        year: revenuePeriod.year,
        month: revenuePeriod.month,
        artistRevenueAmount: { $gt: 0 },
        status: { $in: OFFICIAL_ARTIST_REVENUE_STATUSES },
    })
        .populate(
            "artistId",
            "name avatar verificationStatus activeStatus"
        )
        .sort({ artistRevenueAmount: -1, totalEligibleStreams: -1, _id: 1 })
        .lean();

    const distributedArtists = artistRevenueSummaries.map(formatDistributedArtistItem);

    return {
        id: toId(revenuePeriod._id),
        year: revenuePeriod.year,
        month: revenuePeriod.month,
        label: buildRevenuePeriodLabel(revenuePeriod.year, revenuePeriod.month),
        status: revenuePeriod.status,
        periodStart: revenuePeriod.periodStart,
        periodEnd: revenuePeriod.periodEnd,
        summary: formatRevenuePeriodSummary(revenuePeriod),
        distribution: {
            distributedArtistCount: distributedArtists.length,
            distributedArtistRevenueAmount: distributedArtists.reduce(
                (totalAmount, artist) => totalAmount + artist.artistRevenueAmount,
                0
            ),
            totalWithdrawnAmount: distributedArtists.reduce(
                (totalAmount, artist) => totalAmount + artist.withdrawnAmount,
                0
            ),
            totalAvailableAmount: distributedArtists.reduce(
                (totalAmount, artist) => totalAmount + artist.availableAmount,
                0
            ),
        },
        artists: distributedArtists,
        confirmedBy: revenuePeriod.confirmedBy
            ? {
                id: toId(revenuePeriod.confirmedBy._id),
                email: revenuePeriod.confirmedBy.email || "",
                fullName: revenuePeriod.confirmedBy.profile?.fullName || "",
            }
            : null,
        timestamps: formatRevenuePeriodTimestamps(revenuePeriod),
    };
};

const triggerRevenueAggregation = async (payload = {}) => {
    const targetDateInput = payload.targetMonth
        ? `${payload.targetMonth}-01`
        : undefined;

    const result = await runRevenueAggregation(targetDateInput);

    if (!result) {
        throw new AppError(
            "Revenue aggregation is already running. Please try again in a moment.",
            409
        );
    }

    return result;
};

export default {
    getRevenueDashboard,
    getRevenuePeriods,
    getRevenuePeriodDetail,
    triggerRevenueAggregation,
};
