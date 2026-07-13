import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import ListenEvent from "../../models/ListenEvent.js";
import ArtistRanking, {
    ARTIST_RANKING_PERIOD_TYPES,
    buildDailyArtistRankingFilter,
} from "../../models/ArtistRanking.js";
import { getAnalyticsTimezone } from "./trackStatAggregation.service.js";
import {
    buildArtistAggregationPipeline,
    buildTopArtistRankings,
    fillMissingArtistRankings,
} from "./artistRanking.shared.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const buildStoredDayDate = (targetDay) =>
    dayjs.utc(`${targetDay.format("YYYY-MM-DD")}T00:00:00Z`).toDate();

const syncDailyArtistStats = async ({ date, dateKey, startDate, endDate, dailyStats }) => {
    const baseRankings = buildTopArtistRankings(dailyStats);
    const rankings = await fillMissingArtistRankings(baseRankings);
    const rankingFilter = buildDailyArtistRankingFilter({
        dateKey,
        startDate,
        endDate,
    });

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
        periodType: ARTIST_RANKING_PERIOD_TYPES.DAILY,
        dateKey,
        date,
        rankings,
    });

    return {
        matchedArtists: dailyStats.length,
        storedArtists: rankings.length,
        fillerArtists: Math.max(0, rankings.length - baseRankings.length),
        deletedCount: deleteResult.deletedCount || 0,
        upsertedCount: 1,
    };
};

export const syncArtistDailyStatsForDay = async (targetDateInput) => {
    const analyticsTimezone = getAnalyticsTimezone();
    const targetDay = targetDateInput
        ? dayjs(targetDateInput).tz(analyticsTimezone).startOf("day")
        : dayjs().tz(analyticsTimezone).subtract(1, "day").startOf("day");

    const nextDay = targetDay.add(1, "day");
    const date = buildStoredDayDate(targetDay);
    const dateKey = targetDay.format("YYYY-MM-DD");
    const dailyStats = await ListenEvent.aggregate(
        buildArtistAggregationPipeline({
            startDate: targetDay.toDate(),
            endDate: nextDay.toDate(),
        })
    );

    const dailyResult = await syncDailyArtistStats({
        date,
        dateKey,
        startDate: targetDay.toDate(),
        endDate: nextDay.toDate(),
        dailyStats,
    });

    return {
        timezone: analyticsTimezone,
        targetDate: targetDay.format("YYYY-MM-DD"),
        daily: dailyResult,
    };
};

export { getAnalyticsTimezone };

export default {
    syncArtistDailyStatsForDay,
    getAnalyticsTimezone,
};
