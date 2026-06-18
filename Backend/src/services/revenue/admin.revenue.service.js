import ArtistRevenueSummary from "../../models/ArtistRevenueSummary.js";
import RevenuePeriod from "../../models/RevenuePeriod.js";
import Transaction from "../../models/Transaction.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
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

const readAggregateNumber = (aggregationResult, fieldName) =>
    Number(aggregationResult?.[0]?.[fieldName] || 0);

const calculateArtistPool = (premiumRevenue) =>
    Math.round((Number(premiumRevenue) || 0) * (ARTIST_REVENUE_SHARE_PERCENT / 100));

const resolveLastUpdatedAt = (...dates) => {
    const latestTimestamp = dates
        .filter(Boolean)
        .map((value) => new Date(value).getTime())
        .reduce((maxTimestamp, value) => Math.max(maxTimestamp, value), 0);

    return latestTimestamp > 0 ? new Date(latestTimestamp).toISOString() : null;
};

const buildPeriodRevenueMatch = (periodStart, periodEnd) => ({
    status: "success",
    paidAt: { $gte: periodStart, $lt: periodEnd },
});

const aggregateRevenueMonthlyChart = async ({ year, currentMonth, timezoneName }) => {
    const periodStart = dayjs()
        .tz(timezoneName)
        .year(year)
        .month(0)
        .startOf("month");
    const periodEnd = dayjs()
        .tz(timezoneName)
        .year(year)
        .month(currentMonth - 1)
        .startOf("month")
        .add(1, "month");

    const monthlyStats = await Transaction.aggregate([
        {
            $match: buildPeriodRevenueMatch(periodStart.toDate(), periodEnd.toDate()),
        },
        {
            $group: {
                _id: {
                    year: { $year: "$paidAt" },
                    month: { $month: "$paidAt" },
                },
                premiumRevenue: { $sum: "$amount" },
                successfulTransactions: { $sum: 1 },
            },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const monthMap = new Map(
        monthlyStats.map((item) => [
            `${item._id.year}-${String(item._id.month).padStart(2, "0")}`,
            item,
        ])
    );

    const months = [];
    for (let month = 1; month <= currentMonth; month += 1) {
        const monthKey = `${year}-${String(month).padStart(2, "0")}`;
        const stat = monthMap.get(monthKey);
        const premiumRevenue = readAggregateNumber([stat], "premiumRevenue");
        const artistPool = calculateArtistPool(premiumRevenue);
        const platformRevenue = premiumRevenue - artistPool;

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
            successfulTransactions: readAggregateNumber(
                [stat],
                "successfulTransactions"
            ),
        });
    }

    return months;
};

const aggregateRevenueDailyChart = async ({ currentYear, currentMonth, currentDay, timezoneName }) => {
    const endDay = dayjs()
        .tz(timezoneName)
        .year(currentYear)
        .month(currentMonth - 1)
        .date(currentDay)
        .endOf("day");
    const startDay = endDay.subtract(13, "day").startOf("day");

    const dailyStats = await Transaction.aggregate([
        {
            $match: buildPeriodRevenueMatch(startDay.toDate(), endDay.add(1, "millisecond").toDate()),
        },
        {
            $group: {
                _id: {
                    year: { $year: "$paidAt" },
                    month: { $month: "$paidAt" },
                    day: { $dayOfMonth: "$paidAt" },
                },
                premiumRevenue: { $sum: "$amount" },
                successfulTransactions: { $sum: 1 },
            },
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    const dayMap = new Map(
        dailyStats.map((item) => [
            `${item._id.year}-${String(item._id.month).padStart(2, "0")}-${String(item._id.day).padStart(2, "0")}`,
            item,
        ])
    );

    const days = [];
    let cursor = startDay.clone();
    while (cursor.valueOf() <= endDay.valueOf()) {
        const dayKey = cursor.format("YYYY-MM-DD");
        const stat = dayMap.get(dayKey);
        const premiumRevenue = readAggregateNumber([stat], "premiumRevenue");
        const artistPool = calculateArtistPool(premiumRevenue);
        const platformRevenue = premiumRevenue - artistPool;

        days.push({
            date: dayKey,
            label: cursor.format("DD MMM"),
            premiumRevenue,
            artistPool,
            platformRevenue,
            successfulTransactions: readAggregateNumber(
                [stat],
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

    const [
        transactionSummary,
        totalArtistPoolSummary,
        distributedArtistRevenueSummary,
        revenuePeriod,
        latestTransaction,
        latestArtistRevenueSummary,
    ] = await Promise.all([
        Transaction.aggregate([
            {
                $match: {
                    status: "success",
                    paidAt: { $gte: periodStart, $lt: periodEnd },
                },
            },
            {
                $group: {
                    _id: null,
                    premiumRevenue: { $sum: "$amount" },
                    successfulTransactions: { $sum: 1 },
                },
            },
        ]),
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
        RevenuePeriod.findOne({ year, month }).lean(),
        Transaction.findOne({
            status: "success",
            paidAt: { $gte: periodStart, $lt: periodEnd },
        })
            .sort({ updatedAt: -1 })
            .select("updatedAt")
            .lean(),
        ArtistRevenueSummary.findOne({
            status: { $in: OFFICIAL_ARTIST_REVENUE_STATUSES },
        })
            .sort({ updatedAt: -1 })
            .select("updatedAt")
            .lean(),
    ]);

    const premiumRevenue = readAggregateNumber(transactionSummary, "premiumRevenue");
    const successfulTransactions = readAggregateNumber(
        transactionSummary,
        "successfulTransactions"
    );
    const artistPool = calculateArtistPool(premiumRevenue);
    const platformRevenue = premiumRevenue - artistPool;
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
        monthly: await aggregateRevenueMonthlyChart({
            year: currentYear,
            currentMonth,
            timezoneName: timezone,
        }),
        last14Days: await aggregateRevenueDailyChart({
            currentYear,
            currentMonth,
            currentDay: dayjs().tz(timezone).date(),
            timezoneName: timezone,
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
                revenuePeriod?.updatedAt,
                latestTransaction?.updatedAt,
                latestArtistRevenueSummary?.updatedAt
            ),
        },
    };
};

export default {
    getRevenueDashboard,
};
