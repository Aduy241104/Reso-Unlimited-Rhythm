import mongoose from "mongoose";
import Artist from "../../models/Artist.js";
import ArtistRevenueSummary from "../../models/ArtistRevenueSummary.js";
import ListenEvent from "../../models/ListenEvent.js";
import RevenuePeriod from "../../models/RevenuePeriod.js";
import TrackMonthlyStat from "../../models/TrackMonthlyStat.js";
import Transaction from "../../models/Transaction.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { normalizePositiveInteger } from "../Playlist/playlist.helper.js";
import { AppError } from "../../utils/AppError.js";
import { runRevenueAggregation } from "../../jobs/revenueAggregation.cron.js";
import {
    ARTIST_REVENUE_SHARE_PERCENT,
    ARTIST_REVENUE_SHARE_RATIO,
    PLATFORM_REVENUE_SHARE_PERCENT,
    buildRevenuePeriodRange,
    normalizeRevenueDashboardPeriod,
    resolveRevenuePeriodStatus,
} from "../../helpers/revenuePeriod.helper.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const OFFICIAL_ARTIST_REVENUE_STATUSES = ["calculated", "confirmed"];
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const readRevenuePeriodNumber = (revenuePeriod, fieldName) =>
    Number(revenuePeriod?.[fieldName] || 0);

const roundCurrency = (value) => Math.max(0, Math.round(Number(value) || 0));

const toId = (value) => {
    if (!value) {
        return null;
    }

    return value.toString();
};

const calculateArtistPool = (premiumRevenue) =>
    roundCurrency((Number(premiumRevenue) || 0) * ARTIST_REVENUE_SHARE_RATIO);

const ensureRevenuePeriodId = (revenuePeriodId) => {
    if (!mongoose.Types.ObjectId.isValid(revenuePeriodId)) {
        throw new AppError("Revenue period id is invalid.", 400, { field: "id" });
    }
};

const findRevenuePeriodById = async (revenuePeriodId, options = {}) => {
    ensureRevenuePeriodId(revenuePeriodId);

    const revenuePeriod = await RevenuePeriod.findById(revenuePeriodId, null, options);

    if (!revenuePeriod) {
        throw new AppError("Revenue period not found.", 404, { field: "id" });
    }

    return revenuePeriod;
};

const buildRevenuePeriodDateRange = (revenuePeriod) => ({
    $gte: revenuePeriod.periodStart,
    $lt: revenuePeriod.periodEnd,
});

const aggregateRevenuePeriodTransactions = async (revenuePeriod) => {
    const summary = await Transaction.aggregate([
        {
            $match: {
                status: "success",
                paidAt: buildRevenuePeriodDateRange(revenuePeriod),
            },
        },
        {
            $group: {
                _id: null,
                totalPremiumRevenue: { $sum: "$amount" },
                successfulTransactions: { $sum: 1 },
            },
        },
    ]);

    return {
        totalPremiumRevenue: roundCurrency(summary[0]?.totalPremiumRevenue || 0),
        successfulTransactions: Number(summary[0]?.successfulTransactions || 0),
    };
};

const countRevenuePeriodEligibleStreams = async (revenuePeriod) => {
    const summary = await ListenEvent.aggregate([
        {
            $match: {
                listenedAt: buildRevenuePeriodDateRange(revenuePeriod),
                isValidStream: true,
                trackId: { $exists: true, $ne: null },
                artistId: { $exists: true, $ne: null },
            },
        },
        {
            $group: {
                _id: null,
                totalEligibleStreams: { $sum: 1 },
            },
        },
    ]);

    return Number(summary[0]?.totalEligibleStreams || 0);
};

const aggregateEligibleStreamsByArtist = async (revenuePeriod) =>
    ListenEvent.aggregate([
        {
            $match: {
                listenedAt: buildRevenuePeriodDateRange(revenuePeriod),
                isValidStream: true,
                artistId: { $exists: true, $ne: null },
            },
        },
        {
            $group: {
                _id: "$artistId",
                totalEligibleStreams: { $sum: 1 },
            },
        },
    ]);

const aggregateEligibleStreamsByTrack = async (revenuePeriod) =>
    ListenEvent.aggregate([
        {
            $match: {
                listenedAt: buildRevenuePeriodDateRange(revenuePeriod),
                isValidStream: true,
                trackId: { $exists: true, $ne: null },
            },
        },
        {
            $group: {
                _id: "$trackId",
                eligibleStreams: { $sum: 1 },
            },
        },
    ]);

const buildRevenuePeriodLabel = (year, month) =>
    `${String(month).padStart(2, "0")}/${year}`;

const resolveLastUpdatedAt = (...dates) => {
    const latestTimestamp = dates
        .filter(Boolean)
        .map((value) => new Date(value).getTime())
        .reduce((maxTimestamp, value) => Math.max(maxTimestamp, value), 0);

    return latestTimestamp > 0 ? new Date(latestTimestamp).toISOString() : null;
};

const isFutureRevenuePeriod = ({
    year,
    month,
    currentYear,
    currentMonth,
}) => {
    if (year > currentYear) {
        return true;
    }

    return year === currentYear && month > currentMonth;
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

const buildRevenuePeriodReminder = (status) => {
    switch (status) {
        case "open":
            return {
                code: "past_period_not_closed",
                severity: "warning",
                message:
                    "Ky doanh thu truoc day chua duoc chot. Ban co the chot ky de khoa so lieu va tiep tuc phan chia doanh thu cho artist.",
            };
        case "closed":
            return {
                code: "past_period_not_calculated",
                severity: "warning",
                message:
                    "Ky doanh thu nay da duoc chot nhung chua tinh doanh thu cho artist. Ban co the tiep tuc phan chia doanh thu cho ky nay.",
            };
        case "calculated":
            return {
                code: "past_period_not_confirmed",
                severity: "info",
                message:
                    "Ky doanh thu nay da tinh doanh thu nhung chua xac nhan phan chia cho artist. Ban co the tinh lai neu so lieu thay doi hoac xac nhan de cong tien vao vi artist.",
            };
        default:
            return null;
    }
};

const buildRevenuePeriodActions = (status) => ({
    canClose: status === "open",
    canCalculate: status === "closed" || status === "calculated",
    canRecalculate: status === "calculated",
    canConfirm: status === "calculated",
});

const buildRevenuePeriodAvailableActions = (status) => {
    switch (status) {
        case "open":
            return ["close"];
        case "closed":
            return ["calculate"];
        case "calculated":
            return ["confirm"];
        case "confirmed":
        default:
            return [];
    }
};

const buildRevenuePeriodWorkflow = (revenuePeriod) => {
    const status = revenuePeriod?.status || "open";
    const reminder = buildRevenuePeriodReminder(status);

    return {
        needsAttention: Boolean(reminder),
        reminder,
        actions: buildRevenuePeriodActions(status),
    };
};

const formatRevenuePeriodConfirmedBy = (confirmedBy) =>
    confirmedBy
        ? {
            id: toId(confirmedBy._id),
            email: confirmedBy.email || "",
            fullName: confirmedBy.profile?.fullName || "",
        }
        : null;

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
    availableActions: buildRevenuePeriodAvailableActions(revenuePeriod.status),
    workflow: buildRevenuePeriodWorkflow(revenuePeriod),
    timestamps: formatRevenuePeriodTimestamps(revenuePeriod),
});

const buildVirtualRevenuePeriod = ({
    year,
    month,
    currentYear,
    currentMonth,
    timezone,
}) => {
    const { periodStart, periodEnd } = buildRevenuePeriodRange(
        year,
        month,
        timezone
    );

    return {
        year,
        month,
        status: resolveRevenuePeriodStatus({
            revenuePeriodStatus: null,
            selectedYear: year,
            selectedMonth: month,
            currentYear,
            currentMonth,
        }),
        periodStart,
        periodEnd,
        totalPremiumRevenue: 0,
        totalArtistPool: 0,
        totalPlatformRevenue: 0,
        totalEligibleStreams: 0,
        successfulTransactions: 0,
        lastAggregatedAt: null,
        closedAt: null,
        calculatedAt: null,
        confirmedAt: null,
        confirmedBy: null,
        createdAt: null,
        updatedAt: null,
    };
};

const matchesCurrentRevenuePeriodQuery = ({
    query,
    currentYear,
    currentMonth,
}) => {
    if (query.status && query.status !== "open") {
        return false;
    }

    if (
        typeof query.year !== "undefined" &&
        Number(query.year) !== currentYear
    ) {
        return false;
    }

    if (
        typeof query.month !== "undefined" &&
        Number(query.month) !== currentMonth
    ) {
        return false;
    }

    return true;
};

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

const shouldIncludeRevenueDistribution = (status) =>
    ["calculated", "confirmed"].includes(status);

const buildRevenuePeriodDistribution = (distributedArtists = []) => ({
    distributedArtistCount: distributedArtists.length,
    distributedArtistRevenueAmount: roundCurrency(
        distributedArtists.reduce(
            (totalAmount, artist) => totalAmount + artist.artistRevenueAmount,
            0
        )
    ),
    totalWithdrawnAmount: roundCurrency(
        distributedArtists.reduce(
            (totalAmount, artist) => totalAmount + artist.withdrawnAmount,
            0
        )
    ),
    totalAvailableAmount: roundCurrency(
        distributedArtists.reduce(
            (totalAmount, artist) => totalAmount + artist.availableAmount,
            0
        )
    ),
    artists: distributedArtists,
});

const findDistributedArtistSummaries = async ({
    year,
    month,
    statuses = OFFICIAL_ARTIST_REVENUE_STATUSES,
}) => {
    const artistRevenueSummaries = await ArtistRevenueSummary.find({
        year,
        month,
        artistRevenueAmount: { $gt: 0 },
        status: { $in: statuses },
    })
        .populate(
            "artistId",
            "name avatar verificationStatus activeStatus"
        )
        .sort({ artistRevenueAmount: -1, totalEligibleStreams: -1, _id: 1 })
        .lean();

    return artistRevenueSummaries.map(formatDistributedArtistItem);
};

const findDistributedArtistsByRevenuePeriod = async (revenuePeriod) => {
    if (!shouldIncludeRevenueDistribution(revenuePeriod?.status)) {
        return [];
    }

    return findDistributedArtistSummaries({
        year: revenuePeriod.year,
        month: revenuePeriod.month,
    });
};

const buildRevenuePeriodResponse = async (revenuePeriod) => {
    const distributedArtists = await findDistributedArtistsByRevenuePeriod(
        revenuePeriod
    );

    return {
        period: {
            id: toId(revenuePeriod?._id),
            year: revenuePeriod.year,
            month: revenuePeriod.month,
            label: buildRevenuePeriodLabel(revenuePeriod.year, revenuePeriod.month),
            status: revenuePeriod.status,
            periodStart: revenuePeriod.periodStart,
            periodEnd: revenuePeriod.periodEnd,
        },
        summary: formatRevenuePeriodSummary(revenuePeriod),
        lifecycleTimestamps: formatRevenuePeriodTimestamps(revenuePeriod),
        distribution: shouldIncludeRevenueDistribution(revenuePeriod.status)
            ? buildRevenuePeriodDistribution(distributedArtists)
            : null,
        availableActions: buildRevenuePeriodAvailableActions(revenuePeriod.status),
        confirmedBy: formatRevenuePeriodConfirmedBy(revenuePeriod.confirmedBy),
    };
};

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

const getRevenueCharts = async (query = {}) => {
    const { currentYear, currentMonth, timezone } =
        normalizeRevenueDashboardPeriod(query);
    const endDay = dayjs().tz(timezone).endOf("day");
    const startDay = endDay.subtract(13, "day").startOf("day");

    const [
        currentYearRevenuePeriods,
        dailyChartRevenuePeriods,
        latestRevenuePeriod,
        latestArtistRevenueSummary,
    ] = await Promise.all([
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

    return {
        charts: {
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
        },
        metadata: {
            revenueSharePercent: {
                artist: ARTIST_REVENUE_SHARE_PERCENT,
                platform: PLATFORM_REVENUE_SHARE_PERCENT,
            },
            lastUpdatedAt: resolveLastUpdatedAt(
                latestRevenuePeriod?.lastAggregatedAt || latestRevenuePeriod?.updatedAt,
                latestArtistRevenueSummary?.updatedAt
            ),
        },
    };
};

const getCurrentRevenuePeriod = async () => {
    const { currentYear, currentMonth, timezone } =
        normalizeRevenueDashboardPeriod();

    const revenuePeriod = await RevenuePeriod.findOne({
        year: currentYear,
        month: currentMonth,
    })
        .populate("confirmedBy", "email profile.fullName")
        .lean();

    const currentRevenuePeriod =
        revenuePeriod ||
        buildVirtualRevenuePeriod({
            year: currentYear,
            month: currentMonth,
            currentYear,
            currentMonth,
            timezone,
        });

    return buildRevenuePeriodResponse(currentRevenuePeriod);
};

const getRevenuePeriods = async (query = {}) => {
    const page = normalizePositiveInteger(query.page, DEFAULT_PAGE);
    const requestedLimit = normalizePositiveInteger(query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;
    const { currentYear, currentMonth, timezone } =
        normalizeRevenueDashboardPeriod();

    const filter = {
        $or: [
            { year: { $lt: currentYear } },
            { year: currentYear, month: { $lte: currentMonth } },
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

    const [persistedCurrentRevenuePeriod, persistedTotal] = await Promise.all([
        RevenuePeriod.exists({
            year: currentYear,
            month: currentMonth,
        }),
        RevenuePeriod.countDocuments(filter),
    ]);

    const shouldIncludeVirtualCurrentPeriod =
        !persistedCurrentRevenuePeriod &&
        matchesCurrentRevenuePeriodQuery({
            query,
            currentYear,
            currentMonth,
        });

    const total = persistedTotal + (shouldIncludeVirtualCurrentPeriod ? 1 : 0);
    const persistedSkip = shouldIncludeVirtualCurrentPeriod
        ? Math.max(skip - 1, 0)
        : skip;
    const persistedLimit = shouldIncludeVirtualCurrentPeriod
        ? Math.max(limit - (skip === 0 ? 1 : 0), 0)
        : limit;

    const persistedRevenuePeriods =
        persistedLimit > 0
            ? await RevenuePeriod.find(filter)
                .sort({ year: -1, month: -1, _id: 1 })
                .skip(persistedSkip)
                .limit(persistedLimit)
                .lean()
            : [];

    const revenuePeriods =
        shouldIncludeVirtualCurrentPeriod && skip === 0
            ? [
                buildVirtualRevenuePeriod({
                    year: currentYear,
                    month: currentMonth,
                    currentYear,
                    currentMonth,
                    timezone,
                }),
                ...persistedRevenuePeriods,
            ]
            : persistedRevenuePeriods;

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
    if (revenuePeriodId === "current") {
        return getCurrentRevenuePeriod();
    }

    const { currentYear, currentMonth } = normalizeRevenueDashboardPeriod();

    ensureRevenuePeriodId(revenuePeriodId);

    const revenuePeriod = await RevenuePeriod.findById(revenuePeriodId)
        .populate("confirmedBy", "email profile.fullName")
        .lean();

    if (!revenuePeriod) {
        throw new AppError("Revenue period not found.", 404, { field: "id" });
    }

    if (
        isFutureRevenuePeriod({
            year: revenuePeriod.year,
            month: revenuePeriod.month,
            currentYear,
            currentMonth,
        })
    ) {
        throw new AppError(
            "This endpoint only supports current or past revenue periods.",
            400,
            { field: "id" }
        );
    }

    return buildRevenuePeriodResponse(revenuePeriod);
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

const closeRevenuePeriod = async (revenuePeriodId) => {
    const revenuePeriod = await findRevenuePeriodById(revenuePeriodId);

    if (revenuePeriod.status !== "open") {
        throw new AppError("Only open revenue period can be closed.", 400, {
            field: "status",
        });
    }

    const now = new Date();
    const [transactionSummary, totalEligibleStreams] = await Promise.all([
        aggregateRevenuePeriodTransactions(revenuePeriod),
        countRevenuePeriodEligibleStreams(revenuePeriod),
    ]);
    const totalPremiumRevenue = transactionSummary.totalPremiumRevenue;
    const totalArtistPool = calculateArtistPool(totalPremiumRevenue);
    const totalPlatformRevenue = Math.max(
        totalPremiumRevenue - totalArtistPool,
        0
    );

    const updatedRevenuePeriod = await RevenuePeriod.findByIdAndUpdate(
        revenuePeriod._id,
        {
            $set: {
                totalPremiumRevenue,
                totalArtistPool,
                totalPlatformRevenue,
                totalEligibleStreams,
                successfulTransactions: transactionSummary.successfulTransactions,
                status: "closed",
                closedAt: now,
                lastAggregatedAt: now,
            },
        },
        { new: true, lean: true }
    );

    return {
        periodId: toId(updatedRevenuePeriod._id),
        status: updatedRevenuePeriod.status,
        totalPremiumRevenue,
        totalArtistPool,
        totalPlatformRevenue,
        totalEligibleStreams,
        successfulTransactions: transactionSummary.successfulTransactions,
    };
};

const calculateRevenueDistribution = async (revenuePeriodId) => {
    const revenuePeriod = await findRevenuePeriodById(revenuePeriodId, {
        lean: true,
    });

    if (revenuePeriod.status === "open") {
        throw new AppError(
            "Revenue period must be closed before calculation.",
            400,
            { field: "status" }
        );
    }

    if (revenuePeriod.status === "confirmed") {
        throw new AppError(
            "Confirmed revenue period cannot be calculated again.",
            400,
            { field: "status" }
        );
    }

    if (!["closed", "calculated"].includes(revenuePeriod.status)) {
        throw new AppError(
            "Only closed or previously calculated revenue period can be calculated.",
            400,
            { field: "status" }
        );
    }

    if (readRevenuePeriodNumber(revenuePeriod, "totalEligibleStreams") <= 0) {
        throw new AppError(
            "Revenue period must have eligible streams before calculation.",
            400,
            { field: "totalEligibleStreams" }
        );
    }

    if (readRevenuePeriodNumber(revenuePeriod, "totalArtistPool") < 0) {
        throw new AppError("Revenue period artist pool is invalid.", 400, {
            field: "totalArtistPool",
        });
    }

    const now = new Date();
    const isRecalculation = revenuePeriod.status === "calculated";
    const [artistStreamSummaries, trackStreamSummaries] = await Promise.all([
        aggregateEligibleStreamsByArtist(revenuePeriod),
        aggregateEligibleStreamsByTrack(revenuePeriod),
    ]);

    await Promise.all([
        ArtistRevenueSummary.deleteMany({
            year: revenuePeriod.year,
            month: revenuePeriod.month,
            status: { $ne: "confirmed" },
        }),
        TrackMonthlyStat.updateMany(
            {
                year: revenuePeriod.year,
                month: revenuePeriod.month,
            },
            {
                $set: {
                    "revenue.eligibleStreams": 0,
                    "revenue.revenueAmount": 0,
                    "revenue.artistRevenueAmount": 0,
                    "revenue.calculatedAt": now,
                },
                $unset: {
                    revenueAmount: "",
                    "revenue.grossRevenueAmount": "",
                    "revenue.platformRevenueAmount": "",
                    "revenue.revenueSharePercent": "",
                },
            },
            { strict: false }
        ),
    ]);

    const artistSummaryOperations = artistStreamSummaries
        .filter((item) => item?._id)
        .map((item) => {
            const totalEligibleStreams = Number(item.totalEligibleStreams || 0);
            const artistRevenueAmount = roundCurrency(
                revenuePeriod.totalArtistPool *
                    (totalEligibleStreams / revenuePeriod.totalEligibleStreams)
            );

            return {
                updateOne: {
                    filter: {
                        artistId: item._id,
                        year: revenuePeriod.year,
                        month: revenuePeriod.month,
                    },
                    update: {
                        $set: {
                            totalEligibleStreams,
                            artistRevenueAmount,
                            status: "calculated",
                            calculatedAt: now,
                        },
                        $setOnInsert: {
                            artistId: item._id,
                            year: revenuePeriod.year,
                            month: revenuePeriod.month,
                        },
                    },
                    upsert: true,
                },
            };
        });

    const trackRevenueOperations = trackStreamSummaries
        .filter((item) => item?._id)
        .map((item) => {
            const eligibleStreams = Number(item.eligibleStreams || 0);
            const revenueAmount = roundCurrency(
                revenuePeriod.totalArtistPool *
                    (eligibleStreams / revenuePeriod.totalEligibleStreams)
            );

            return {
                updateOne: {
                    filter: {
                        trackId: item._id,
                        year: revenuePeriod.year,
                        month: revenuePeriod.month,
                    },
                    update: {
                        $set: {
                            "revenue.eligibleStreams": eligibleStreams,
                            "revenue.revenueAmount": revenueAmount,
                            "revenue.artistRevenueAmount": revenueAmount,
                            "revenue.calculatedAt": now,
                        },
                        $unset: {
                            revenueAmount: "",
                            "revenue.grossRevenueAmount": "",
                            "revenue.platformRevenueAmount": "",
                            "revenue.revenueSharePercent": "",
                        },
                        $setOnInsert: {
                            trackId: item._id,
                            year: revenuePeriod.year,
                            month: revenuePeriod.month,
                        },
                    },
                    upsert: true,
                },
            };
        });

    if (artistSummaryOperations.length > 0) {
        await ArtistRevenueSummary.bulkWrite(artistSummaryOperations);
    }

    if (trackRevenueOperations.length > 0) {
        await TrackMonthlyStat.bulkWrite(trackRevenueOperations, {
            strict: false,
        });
    }

    await RevenuePeriod.findByIdAndUpdate(revenuePeriod._id, {
        $set: {
            status: "calculated",
            calculatedAt: now,
        },
    });

    const distributedArtists = await findDistributedArtistSummaries({
        year: revenuePeriod.year,
        month: revenuePeriod.month,
        statuses: ["calculated"],
    });

    return {
        periodId: toId(revenuePeriod._id),
        status: "calculated",
        isRecalculation,
        artistSummaryCount: artistSummaryOperations.length,
        trackRevenueCount: trackRevenueOperations.length,
        distribution: buildRevenuePeriodDistribution(distributedArtists),
    };
};

const confirmRevenueDistribution = async (revenuePeriodId, adminUserId) => {
    ensureRevenuePeriodId(revenuePeriodId);

    if (!adminUserId || !mongoose.Types.ObjectId.isValid(adminUserId)) {
        throw new AppError("Admin user id is invalid.", 400, {
            field: "userId",
        });
    }

    const revenuePeriod = await findRevenuePeriodById(revenuePeriodId);

    if (revenuePeriod.status === "confirmed") {
        throw new AppError("Revenue period has already been confirmed.", 400, {
            field: "status",
        });
    }

    if (revenuePeriod.status !== "calculated") {
        throw new AppError(
            "Revenue period must be calculated before confirmation.",
            400,
            { field: "status" }
        );
    }

    const now = new Date();
    const artistRevenueSummaries = await ArtistRevenueSummary.find({
        year: revenuePeriod.year,
        month: revenuePeriod.month,
        status: { $in: ["calculated", "confirmed"] },
    })
        .select("_id artistId artistRevenueAmount status")
        .lean();

    const artistIds = [
        ...new Set(
            artistRevenueSummaries
                .filter((summary) => summary?.artistId)
                .map((summary) => toId(summary.artistId))
        ),
    ];

    if (artistIds.length > 0) {
        const existingArtistIds = await Artist.find({
            _id: { $in: artistIds },
        })
            .select("_id")
            .lean();

        const existingArtistIdSet = new Set(
            existingArtistIds.map((artist) => toId(artist._id))
        );
        const missingArtistSummary = artistRevenueSummaries.find(
            (summary) =>
                summary?.artistId &&
                !existingArtistIdSet.has(toId(summary.artistId))
        );

        if (missingArtistSummary) {
            throw new AppError(
                "Artist revenue summary references an artist that no longer exists.",
                400,
                {
                    field: "artistId",
                    artistId: toId(missingArtistSummary.artistId),
                }
            );
        }
    }

    const artistBalanceUpdates = artistRevenueSummaries
        .filter(
            (summary) =>
                summary?.artistId && Number(summary.artistRevenueAmount || 0) > 0
        )
        .map((summary) => ({
            updateOne: {
                filter: {
                    _id: summary.artistId,
                    "revenue.confirmedRevenueSummaryIds": { $ne: summary._id },
                },
                update: {
                    $inc: {
                        "revenue.totalEarnedAmount": Number(
                            summary.artistRevenueAmount || 0
                        ),
                        "revenue.availableAmount": Number(
                            summary.artistRevenueAmount || 0
                        ),
                    },
                    $addToSet: {
                        "revenue.confirmedRevenueSummaryIds": summary._id,
                    },
                },
            },
        }));

    if (artistBalanceUpdates.length > 0) {
        await Artist.bulkWrite(artistBalanceUpdates);
    }

    if (artistRevenueSummaries.length > 0) {
        await ArtistRevenueSummary.updateMany(
            {
                _id: { $in: artistRevenueSummaries.map((summary) => summary._id) },
            },
            {
                $set: {
                    status: "confirmed",
                    confirmedAt: now,
                    confirmedBy: adminUserId,
                },
            }
        );
    }

    const updatedRevenuePeriod =
        (await RevenuePeriod.findOneAndUpdate(
            {
                _id: revenuePeriod._id,
                status: "calculated",
            },
            {
                $set: {
                    status: "confirmed",
                    confirmedAt: now,
                    confirmedBy: adminUserId,
                },
            },
            {
                new: true,
            }
        )) ||
        (await RevenuePeriod.findById(revenuePeriod._id));

    const distributedArtists = await findDistributedArtistSummaries({
        year: revenuePeriod.year,
        month: revenuePeriod.month,
        statuses: ["confirmed"],
    });

    return {
        periodId: toId(updatedRevenuePeriod?._id || revenuePeriod._id),
        status: updatedRevenuePeriod?.status || "confirmed",
        confirmedArtistCount: artistRevenueSummaries.length,
        totalConfirmedAmount: roundCurrency(
            artistRevenueSummaries.reduce(
                (totalAmount, summary) =>
                    totalAmount + Number(summary.artistRevenueAmount || 0),
                0
            )
        ),
        distribution: buildRevenuePeriodDistribution(distributedArtists),
    };
};

const processRevenuePeriodAction = async (
    revenuePeriodId,
    action,
    adminUserId
) => {
    const actionHandlers = {
        close: () => closeRevenuePeriod(revenuePeriodId),
        calculate: () => calculateRevenueDistribution(revenuePeriodId),
        confirm: () =>
            confirmRevenueDistribution(revenuePeriodId, adminUserId),
    };

    const handler = actionHandlers[action];

    if (!handler) {
        throw new AppError("Revenue period action is invalid.", 400, {
            field: "action",
        });
    }

    return handler();
};

export default {
    getCurrentRevenuePeriod,
    getRevenueCharts,
    getRevenuePeriods,
    getRevenuePeriodDetail,
    triggerRevenueAggregation,
    processRevenuePeriodAction,
    closeRevenuePeriod,
    calculateRevenueDistribution,
    confirmRevenueDistribution,
};
