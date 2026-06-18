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
                calculatedAt: now,
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

    const [transactionSummary, totalEligibleStreams] = await Promise.all([
        aggregateMonthlyPremiumRevenue({ periodStart, periodEnd }),
        aggregateEligibleStreamCount({ periodStart, periodEnd }),
    ]);

    const premiumRevenue = transactionSummary.premiumRevenue;
    const artistPool = roundCurrency(
        premiumRevenue * (ARTIST_REVENUE_SHARE_PERCENT / 100)
    );
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
