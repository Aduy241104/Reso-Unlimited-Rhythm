import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import ListenEvent from "../../models/ListenEvent.js";
import RevenuePeriod from "../../models/RevenuePeriod.js";
import Transaction from "../../models/Transaction.js";
import {
    ARTIST_REVENUE_SHARE_PERCENT,
    buildRevenuePeriodRange,
    getRevenueDashboardTimezone,
} from "../../helpers/revenuePeriod.helper.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const resolveTargetRevenueMonth = (targetDateInput) => {
    const timezoneName = getRevenueDashboardTimezone();

    if (targetDateInput) {
        return dayjs(targetDateInput).tz(timezoneName).startOf("month");
    }

    return dayjs().tz(timezoneName).startOf("month");
};

const roundCurrency = (value) => Math.max(0, Math.round(Number(value) || 0));

const calculateArtistPool = (premiumRevenue) =>
    roundCurrency(premiumRevenue * (ARTIST_REVENUE_SHARE_PERCENT / 100));

const aggregateMonthlyPremiumRevenue = async ({ periodStart, periodEnd }) => {
    const summary = await Transaction.aggregate([
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
    ]);

    return {
        premiumRevenue: roundCurrency(summary[0]?.premiumRevenue || 0),
        successfulTransactions: Number(summary[0]?.successfulTransactions || 0),
    };
};

const aggregateDailyRevenueStats = async ({
    periodStart,
    periodEnd,
    timezoneName,
}) => {
    const dailyStats = await Transaction.aggregate([
        {
            $match: {
                status: "success",
                paidAt: { $gte: periodStart, $lt: periodEnd },
            },
        },
        {
            $group: {
                _id: {
                    dateKey: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$paidAt",
                            timezone: timezoneName,
                        },
                    },
                },
                premiumRevenue: { $sum: "$amount" },
                successfulTransactions: { $sum: 1 },
            },
        },
        { $sort: { "_id.dateKey": 1 } },
    ]);

    return dailyStats.map((item) => {
        const premiumRevenue = roundCurrency(item?.premiumRevenue || 0);
        const artistPool = calculateArtistPool(premiumRevenue);
        const platformRevenue = Math.max(premiumRevenue - artistPool, 0);
        const date = dayjs.tz(`${item._id.dateKey}T00:00:00`, timezoneName);

        return {
            day: date.date(),
            date: date.toDate(),
            premiumRevenue,
            artistPool,
            platformRevenue,
            successfulTransactions: Number(item?.successfulTransactions || 0),
        };
    });
};

const aggregateEligibleStreamCount = async ({ periodStart, periodEnd }) => {
    const summary = await ListenEvent.aggregate([
        {
            $match: {
                listenedAt: { $gte: periodStart, $lt: periodEnd },
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

const syncRevenuePeriod = async ({
    year,
    month,
    periodStart,
    periodEnd,
    premiumRevenue,
    artistPool,
    platformRevenue,
    totalEligibleStreams,
    successfulTransactions,
    dailyStats,
    now,
}) => {
    const revenuePeriod = await RevenuePeriod.findOneAndUpdate(
        { year, month },
        {
            $set: {
                periodStart,
                periodEnd,
                totalPremiumRevenue: premiumRevenue,
                totalArtistPool: artistPool,
                totalPlatformRevenue: platformRevenue,
                totalEligibleStreams,
                successfulTransactions,
                dailyStats,
                calculatedAt: now,
                lastAggregatedAt: now,
            },
            $setOnInsert: {
                status: "open",
            },
        },
        {
            upsert: true,
            new: true,
            lean: true,
        }
    );

    return revenuePeriod;
};

export const syncRevenueForMonth = async (targetDateInput) => {
    const timezoneName = getRevenueDashboardTimezone();
    const targetMonth = resolveTargetRevenueMonth(targetDateInput);
    const year = targetMonth.year();
    const month = targetMonth.month() + 1;
    const { periodStart, periodEnd } = buildRevenuePeriodRange(
        year,
        month,
        timezoneName
    );
    const now = new Date();

    const [transactionSummary, totalEligibleStreams, dailyStats] = await Promise.all([
        aggregateMonthlyPremiumRevenue({ periodStart, periodEnd }),
        aggregateEligibleStreamCount({ periodStart, periodEnd }),
        aggregateDailyRevenueStats({ periodStart, periodEnd, timezoneName }),
    ]);

    const premiumRevenue = transactionSummary.premiumRevenue;
    const artistPool = calculateArtistPool(premiumRevenue);
    const platformRevenue = Math.max(premiumRevenue - artistPool, 0);

    const revenuePeriod = await syncRevenuePeriod({
        year,
        month,
        periodStart,
        periodEnd,
        premiumRevenue,
        artistPool,
        platformRevenue,
        totalEligibleStreams,
        successfulTransactions: transactionSummary.successfulTransactions,
        dailyStats,
        now,
    });

    return {
        timezone: timezoneName,
        targetMonth: targetMonth.format("YYYY-MM"),
        period: {
            year,
            month,
            periodStart,
            periodEnd,
            status: revenuePeriod?.status || "open",
        },
        summary: {
            premiumRevenue,
            artistPool,
            platformRevenue,
            successfulTransactions: transactionSummary.successfulTransactions,
            totalEligibleStreams,
            updatedTrackStats: 0,
            updatedArtistSummaries: 0,
        },
    };
};

export default {
    syncRevenueForMonth,
};
