import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import ArtistRanking, {
    ARTIST_RANKING_PERIOD_TYPES,
    buildMonthlyArtistRankingFilter,
} from "../../models/ArtistRanking.js";
import ListenEvent from "../../models/ListenEvent.js";
import { getAnalyticsTimezone } from "./trackStatAggregation.service.js";
import {
    buildArtistAggregationPipeline,
    buildTopArtistRankings,
    fillMissingArtistRankings,
} from "./artistRanking.shared.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const syncMonthlyArtistRankings = async ({ year, month, monthlyStats }) => {
    const baseRankings = buildTopArtistRankings(monthlyStats);
    const rankings = await fillMissingArtistRankings(baseRankings);
    const rankingFilter = buildMonthlyArtistRankingFilter({ year, month });

    if (rankings.length === 0) {
        const deleteResult = await ArtistRanking.deleteMany(rankingFilter);

        return {
            matchedArtists: 0,
            deletedCount: deleteResult.deletedCount || 0,
            upsertedCount: 0,
        };
    }

    const deleteResult = await ArtistRanking.deleteMany(rankingFilter);

    await ArtistRanking.create({
        periodType: ARTIST_RANKING_PERIOD_TYPES.MONTHLY,
        year,
        month,
        rankings,
    });

    return {
        matchedArtists: monthlyStats.length,
        storedArtists: rankings.length,
        fillerArtists: Math.max(0, rankings.length - baseRankings.length),
        deletedCount: deleteResult.deletedCount || 0,
        upsertedCount: 1,
    };
};

export const syncArtistMonthlyRankingsForMonth = async (targetMonthInput) => {
    const analyticsTimezone = getAnalyticsTimezone();
    const targetMonth = targetMonthInput
        ? dayjs(targetMonthInput).tz(analyticsTimezone).startOf("month")
        : dayjs().tz(analyticsTimezone).subtract(1, "day").startOf("month");

    const nextMonth = targetMonth.add(1, "month");
    const monthlyStats = await ListenEvent.aggregate(
        buildArtistAggregationPipeline({
            startDate: targetMonth.toDate(),
            endDate: nextMonth.toDate(),
        })
    );

    const monthlyResult = await syncMonthlyArtistRankings({
        year: targetMonth.year(),
        month: targetMonth.month() + 1,
        monthlyStats,
    });

    return {
        timezone: analyticsTimezone,
        targetMonth: targetMonth.format("YYYY-MM"),
        monthly: monthlyResult,
    };
};

export { getAnalyticsTimezone };

export default {
    syncArtistMonthlyRankingsForMonth,
    getAnalyticsTimezone,
};
