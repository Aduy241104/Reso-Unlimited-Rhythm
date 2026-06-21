import ArtistRevenueSummary from "../../models/ArtistRevenueSummary.js";
import RevenuePeriod from "../../models/RevenuePeriod.js";
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

const readRevenuePeriodNumber = (revenuePeriod, fieldName) =>
    Number(revenuePeriod?.[fieldName] || 0);

const calculateArtistPool = (premiumRevenue) =>
    Math.round((Number(premiumRevenue) || 0) * (ARTIST_REVENUE_SHARE_PERCENT / 100));

const resolveLastUpdatedAt = (...dates) => {
    const latestTimestamp = dates
        .filter(Boolean)
        .map((value) => new Date(value).getTime())
        .reduce((maxTimestamp, value) => Math.max(maxTimestamp, value), 0);

    return latestTimestamp > 0 ? new Date(latestTimestamp).toISOString() : null;
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

export default {
    getRevenueDashboard,
};
