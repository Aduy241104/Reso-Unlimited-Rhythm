import ArtistRevenueSummary from "../../models/ArtistRevenueSummary.js";
import RevenuePeriod from "../../models/RevenuePeriod.js";
import Transaction from "../../models/Transaction.js";
import WithdrawalRequest from "../../models/WithdrawalRequest.js";
import {
    ARTIST_REVENUE_SHARE_PERCENT,
    PLATFORM_REVENUE_SHARE_PERCENT,
    buildRevenuePeriodRange,
    normalizeRevenueDashboardPeriod,
    resolveRevenuePeriodStatus,
} from "../../helpers/revenuePeriod.helper.js";

const OFFICIAL_ARTIST_REVENUE_STATUSES = ["calculated", "paid"];
const WITHDRAWAL_STATUSES_FOR_BALANCE = ["pending", "paid"];

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
        artistAvailableSummary,
        pendingWithdrawalSummary,
        paidWithdrawalSummary,
        revenuePeriod,
        latestTransaction,
        latestArtistRevenueSummary,
        latestWithdrawal,
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
        ArtistRevenueSummary.aggregate([
            {
                $match: {
                    status: { $in: OFFICIAL_ARTIST_REVENUE_STATUSES },
                },
            },
            {
                $group: {
                    _id: null,
                    artistAvailableBalance: { $sum: "$availableAmount" },
                },
            },
        ]),
        WithdrawalRequest.aggregate([
            {
                $match: {
                    status: "pending",
                },
            },
            {
                $group: {
                    _id: null,
                    pendingWithdrawalAmount: { $sum: "$amount" },
                },
            },
        ]),
        WithdrawalRequest.aggregate([
            {
                $match: {
                    status: "paid",
                },
            },
            {
                $group: {
                    _id: null,
                    paidWithdrawalAmount: { $sum: "$amount" },
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
        WithdrawalRequest.findOne({
            status: { $in: WITHDRAWAL_STATUSES_FOR_BALANCE },
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
            artistAvailableBalance: readAggregateNumber(
                artistAvailableSummary,
                "artistAvailableBalance"
            ),
            pendingWithdrawalAmount: readAggregateNumber(
                pendingWithdrawalSummary,
                "pendingWithdrawalAmount"
            ),
            paidWithdrawalAmount: readAggregateNumber(
                paidWithdrawalSummary,
                "paidWithdrawalAmount"
            ),
        },
        metadata: {
            revenueSharePercent: {
                artist: ARTIST_REVENUE_SHARE_PERCENT,
                platform: PLATFORM_REVENUE_SHARE_PERCENT,
            },
            lastUpdatedAt: resolveLastUpdatedAt(
                revenuePeriod?.updatedAt,
                latestTransaction?.updatedAt,
                latestArtistRevenueSummary?.updatedAt,
                latestWithdrawal?.updatedAt
            ),
        },
    };
};

export default {
    getRevenueDashboard,
};
