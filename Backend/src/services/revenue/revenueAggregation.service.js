import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import ArtistRevenueSummary from "../../models/ArtistRevenueSummary.js";
import ListenEvent from "../../models/ListenEvent.js";
import RevenuePeriod from "../../models/RevenuePeriod.js";
import TrackMonthlyStat from "../../models/TrackMonthlyStat.js";
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

const allocateIntegerShares = (items, totalAmount, getWeight, getKey) => {
    const normalizedTotalAmount = roundCurrency(totalAmount);
    const normalizedItems = Array.isArray(items) ? items : [];
    const totalWeight = normalizedItems.reduce(
        (sum, item) => sum + Math.max(0, Number(getWeight(item)) || 0),
        0
    );

    if (normalizedTotalAmount <= 0 || totalWeight <= 0 || normalizedItems.length === 0) {
        return new Map(normalizedItems.map((item) => [String(getKey(item)), 0]));
    }

    const provisionalAllocations = normalizedItems.map((item) => {
        const key = String(getKey(item));
        const weight = Math.max(0, Number(getWeight(item)) || 0);
        const rawShare = (normalizedTotalAmount * weight) / totalWeight;
        const flooredShare = Math.floor(rawShare);

        return {
            key,
            rawShare,
            flooredShare,
            remainder: rawShare - flooredShare,
        };
    });

    let remainingAmount =
        normalizedTotalAmount -
        provisionalAllocations.reduce((sum, item) => sum + item.flooredShare, 0);

    provisionalAllocations.sort((left, right) => {
        if (right.remainder !== left.remainder) {
            return right.remainder - left.remainder;
        }

        return left.key.localeCompare(right.key);
    });

    for (let index = 0; index < provisionalAllocations.length && remainingAmount > 0; index += 1) {
        provisionalAllocations[index].flooredShare += 1;
        remainingAmount -= 1;
    }

    return new Map(
        provisionalAllocations.map((item) => [item.key, item.flooredShare])
    );
};

const buildTrackRevenueStats = ({
    trackStats,
    premiumRevenue,
    artistPool,
    platformRevenue,
}) => {
    const grossRevenueAllocations = allocateIntegerShares(
        trackStats,
        premiumRevenue,
        (item) => item.eligibleStreams,
        (item) => item.trackId
    );
    const artistRevenueAllocations = allocateIntegerShares(
        trackStats,
        artistPool,
        (item) => item.eligibleStreams,
        (item) => item.trackId
    );
    const platformRevenueAllocations = allocateIntegerShares(
        trackStats,
        platformRevenue,
        (item) => item.eligibleStreams,
        (item) => item.trackId
    );

    return trackStats.map((trackStat) => ({
        ...trackStat,
        grossRevenueAmount:
            grossRevenueAllocations.get(String(trackStat.trackId)) || 0,
        artistRevenueAmount:
            artistRevenueAllocations.get(String(trackStat.trackId)) || 0,
        platformRevenueAmount:
            platformRevenueAllocations.get(String(trackStat.trackId)) || 0,
    }));
};

const buildArtistRevenueStats = (trackRevenueStats) => {
    const artistMap = new Map();

    for (const trackStat of trackRevenueStats) {
        const artistKey = String(trackStat.artistId);
        const currentValue = artistMap.get(artistKey) || {
            artistId: trackStat.artistId,
            totalEligibleStreams: 0,
            grossRevenueAmount: 0,
            artistRevenueAmount: 0,
            platformRevenueAmount: 0,
        };

        currentValue.totalEligibleStreams += Number(trackStat.eligibleStreams || 0);
        currentValue.grossRevenueAmount += Number(trackStat.grossRevenueAmount || 0);
        currentValue.artistRevenueAmount += Number(trackStat.artistRevenueAmount || 0);
        currentValue.platformRevenueAmount += Number(trackStat.platformRevenueAmount || 0);

        artistMap.set(artistKey, currentValue);
    }

    return [...artistMap.values()];
};

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

const aggregateEligibleTrackStats = async ({ periodStart, periodEnd }) => {
    const trackStats = await ListenEvent.aggregate([
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
                _id: {
                    trackId: "$trackId",
                    artistId: "$artistId",
                },
                eligibleStreams: { $sum: 1 },
                uniqueListeners: { $addToSet: "$userId" },
            },
        },
        {
            $project: {
                _id: 0,
                trackId: "$_id.trackId",
                artistId: "$_id.artistId",
                eligibleStreams: 1,
                uniqueListeners: { $size: "$uniqueListeners" },
            },
        },
    ]);

    return trackStats.map((stat) => ({
        trackId: stat.trackId,
        artistId: stat.artistId,
        eligibleStreams: Number(stat.eligibleStreams || 0),
        uniqueListeners: Number(stat.uniqueListeners || 0),
    }));
};

const syncTrackMonthlyRevenueStats = async ({
    year,
    month,
    now,
    trackRevenueStats,
    existingTrackStats,
}) => {
    const existingTrackIdSet = new Set(
        existingTrackStats.map((item) => String(item.trackId))
    );
    const computedTrackIds = new Set(
        trackRevenueStats.map((item) => String(item.trackId))
    );
    const targetTrackIds = new Set([...existingTrackIdSet, ...computedTrackIds]);

    if (targetTrackIds.size === 0) {
        return { updatedTrackStats: 0 };
    }

    const computedTrackMap = new Map(
        trackRevenueStats.map((item) => [String(item.trackId), item])
    );

    const operations = [...targetTrackIds].map((trackId) => {
        const trackStat = computedTrackMap.get(trackId);

        if (trackStat) {
            return {
                updateOne: {
                    filter: { trackId: trackStat.trackId, year, month },
                    update: {
                        $set: {
                            "revenue.eligibleStreams": trackStat.eligibleStreams,
                            "revenue.grossRevenueAmount": trackStat.grossRevenueAmount,
                            "revenue.artistRevenueAmount": trackStat.artistRevenueAmount,
                            "revenue.platformRevenueAmount": trackStat.platformRevenueAmount,
                            "revenue.revenueSharePercent": ARTIST_REVENUE_SHARE_PERCENT,
                            "revenue.calculatedAt": now,
                        },
                        $setOnInsert: {
                            playCount: trackStat.eligibleStreams,
                            uniqueListeners: trackStat.uniqueListeners,
                        },
                    },
                    upsert: true,
                },
            };
        }

        return {
            updateOne: {
                filter: { trackId, year, month },
                update: {
                    $set: {
                        "revenue.eligibleStreams": 0,
                        "revenue.grossRevenueAmount": 0,
                        "revenue.artistRevenueAmount": 0,
                        "revenue.platformRevenueAmount": 0,
                        "revenue.revenueSharePercent": ARTIST_REVENUE_SHARE_PERCENT,
                        "revenue.calculatedAt": now,
                    },
                },
            },
        };
    });

    await TrackMonthlyStat.bulkWrite(operations);

    return { updatedTrackStats: operations.length };
};

const syncArtistRevenueSummaries = async ({
    year,
    month,
    now,
    artistRevenueStats,
    existingArtistSummaries,
}) => {
    const existingArtistMap = new Map(
        existingArtistSummaries.map((item) => [String(item.artistId), item])
    );
    const computedArtistMap = new Map(
        artistRevenueStats.map((item) => [String(item.artistId), item])
    );
    const targetArtistIds = new Set([
        ...existingArtistMap.keys(),
        ...computedArtistMap.keys(),
    ]);

    if (targetArtistIds.size === 0) {
        return { updatedArtistSummaries: 0 };
    }

    const operations = [...targetArtistIds].map((artistId) => {
        const existingSummary = existingArtistMap.get(artistId);
        const computedSummary = computedArtistMap.get(artistId);
        const withdrawnAmount = roundCurrency(existingSummary?.withdrawnAmount || 0);
        const artistRevenueAmount = roundCurrency(
            computedSummary?.artistRevenueAmount || 0
        );

        return {
            updateOne: {
                filter: { artistId, year, month },
                update: {
                    $set: {
                        totalEligibleStreams: Number(
                            computedSummary?.totalEligibleStreams || 0
                        ),
                        grossRevenueAmount: roundCurrency(
                            computedSummary?.grossRevenueAmount || 0
                        ),
                        artistRevenueAmount,
                        platformRevenueAmount: roundCurrency(
                            computedSummary?.platformRevenueAmount || 0
                        ),
                        withdrawnAmount,
                        availableAmount: Math.max(artistRevenueAmount - withdrawnAmount, 0),
                        status: existingSummary?.status === "paid" ? "paid" : "calculated",
                        calculatedAt: now,
                    },
                },
                upsert: true,
            },
        };
    });

    await ArtistRevenueSummary.bulkWrite(operations);

    return { updatedArtistSummaries: operations.length };
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

    const [
        transactionSummary,
        eligibleTrackStats,
        existingTrackStats,
        existingArtistSummaries,
    ] = await Promise.all([
        aggregateMonthlyPremiumRevenue({ periodStart, periodEnd }),
        aggregateEligibleTrackStats({ periodStart, periodEnd }),
        TrackMonthlyStat.find({ year, month }).select("trackId").lean(),
        ArtistRevenueSummary.find({ year, month })
            .select("artistId withdrawnAmount status")
            .lean(),
    ]);

    const premiumRevenue = transactionSummary.premiumRevenue;
    const artistPool = roundCurrency(
        premiumRevenue * (ARTIST_REVENUE_SHARE_PERCENT / 100)
    );
    const platformRevenue = Math.max(premiumRevenue - artistPool, 0);
    const totalEligibleStreams = eligibleTrackStats.reduce(
        (sum, item) => sum + Number(item.eligibleStreams || 0),
        0
    );

    const trackRevenueStats = buildTrackRevenueStats({
        trackStats: eligibleTrackStats,
        premiumRevenue,
        artistPool,
        platformRevenue,
    });
    const artistRevenueStats = buildArtistRevenueStats(trackRevenueStats);

    const [trackSyncResult, artistSyncResult, revenuePeriod] = await Promise.all([
        syncTrackMonthlyRevenueStats({
            year,
            month,
            now,
            trackRevenueStats,
            existingTrackStats,
        }),
        syncArtistRevenueSummaries({
            year,
            month,
            now,
            artistRevenueStats,
            existingArtistSummaries,
        }),
        syncRevenuePeriod({
            year,
            month,
            periodStart,
            periodEnd,
            premiumRevenue,
            artistPool,
            platformRevenue,
            totalEligibleStreams,
            now,
        }),
    ]);

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
            updatedTrackStats: trackSyncResult.updatedTrackStats,
            updatedArtistSummaries: artistSyncResult.updatedArtistSummaries,
        },
    };
};

export default {
    syncRevenueForMonth,
};
