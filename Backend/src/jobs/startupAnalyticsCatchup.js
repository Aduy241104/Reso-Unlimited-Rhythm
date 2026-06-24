import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import Artist from "../models/Artist.js";
import ArtistDailyStat from "../models/ArtistDailyStat.js";
import ArtistDailyRanking from "../models/ArtistDailyRanking.js";
import ArtistMonthlyRanking from "../models/ArtistMonthlyRanking.js";
import ListenEvent from "../models/ListenEvent.js";
import RecentListeningActivity from "../models/user.recentListening.model.js";
import TrackDailyRanking from "../models/TrackDailyRanking.js";
import TrackDailyStat from "../models/TrackDailyStat.js";
import TrackMonthlyRanking from "../models/TrackMonthlyRanking.js";
import TrackMonthlyStat from "../models/TrackMonthlyStat.js";
import UserListeningDailyStat from "../models/UserListeningDailyStat.js";
import { runDailyTopArtistAggregation } from "./dailyTopArtist.cron.js";
import { runDailyArtistOverviewStatAggregation } from "./dailyArtistOverviewStat.cron.js";
import { runDailyTrackStatAggregation } from "./dailyTrackStat.cron.js";
import { runUserListeningDailyStatAggregation } from "./dailyUserListeningStat.cron.js";
import { runDailyTopTrackAggregation } from "./dailyTopTrack.cron.js";
import { runMonthlyTopArtistAggregation } from "./monthlyTopArtist.cron.js";
import { runMonthlyTrackStatAggregation } from "./monthlyTrackStat.cron.js";
import { runMonthlyTopTrackAggregation } from "./monthlyTopTrack.cron.js";
import { getAnalyticsTimezone } from "../services/analytics/trackStatAggregation.service.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const hasPassedMinuteOfDay = (currentTime, hour, minute) => {
    const threshold = currentTime.startOf("day").add(hour, "hour").add(minute, "minute");
    return currentTime.isSame(threshold) || currentTime.isAfter(threshold);
};

const hasTrackListenEventsInRange = async (startDate, endDate) =>
    Boolean(
        await ListenEvent.exists({
            trackId: { $exists: true, $ne: null },
            listenedAt: { $gte: startDate, $lt: endDate },
        })
    );

const hasArtistListenEventsInRange = async (startDate, endDate) =>
    Boolean(
        await ListenEvent.exists({
            artistId: { $exists: true, $ne: null },
            listenedAt: { $gte: startDate, $lt: endDate },
        })
    );

const hasRecentListeningActivitiesInRange = async (startDate, endDate) =>
    Boolean(
        await RecentListeningActivity.exists({
            listenedAt: { $gte: startDate, $lt: endDate },
        })
    );

const runStartupAnalyticsCatchup = async () => {
    const analyticsTimezone = getAnalyticsTimezone();
    const now = dayjs().tz(analyticsTimezone);
    const targetDay = now.subtract(1, "day").startOf("day");
    const nextDay = targetDay.add(1, "day");
    const artistMonthlyTarget = targetDay.startOf("month");
    const nextArtistMonthlyTarget = artistMonthlyTarget.add(1, "month");
    const completedTrackMonth = now.startOf("month").subtract(1, "month");
    const nextCompletedTrackMonth = completedTrackMonth.add(1, "month");
    const trackMonthlyYear = completedTrackMonth.year();
    const trackMonthlyMonth = completedTrackMonth.month() + 1;
    const completedTrackMonthKey = completedTrackMonth.format("YYYY-MM-01");
    const targetDayDate = targetDay.toDate();
    const nextDayDate = nextDay.toDate();
    const completedTrackMonthDate = completedTrackMonth.toDate();
    const nextCompletedTrackMonthDate = nextCompletedTrackMonth.toDate();

    const shouldRunArtistDailyStatisticCatchup = hasPassedMinuteOfDay(now, 0, 3);
    const shouldRunStatisticCatchup = hasPassedMinuteOfDay(now, 0, 0);
    const shouldRunRankingCatchup = hasPassedMinuteOfDay(now, 0, 5);

    const [
        hasArtistDailyStats,
        hasUserListeningDailyStats,
        hasTrackDailyStats,
        hasTrackDailyRanking,
        hasTrackMonthlyStats,
        hasTrackMonthlyRanking,
        hasArtistDailyRanking,
        hasArtistMonthlyRanking,
        hasTrackDailySourceData,
        hasTrackMonthlySourceData,
        hasArtistDailySourceData,
        hasUserListeningDailySourceData,
        hasArtistMonthlySourceData,
        hasActiveArtists,
    ] = await Promise.all([
        ArtistDailyStat.exists({
            date: { $gte: targetDayDate, $lt: nextDayDate },
        }),
        UserListeningDailyStat.exists({
            date: { $gte: targetDayDate, $lt: nextDayDate },
        }),
        TrackDailyStat.exists({
            date: { $gte: targetDayDate, $lt: nextDayDate },
        }),
        TrackDailyRanking.exists({
            date: { $gte: targetDayDate, $lt: nextDayDate },
        }),
        TrackMonthlyStat.exists({ year: trackMonthlyYear, month: trackMonthlyMonth }),
        TrackMonthlyRanking.exists({ year: trackMonthlyYear, month: trackMonthlyMonth }),
        ArtistDailyRanking.exists({
            date: { $gte: targetDayDate, $lt: nextDayDate },
        }),
        ArtistMonthlyRanking.exists({
            year: artistMonthlyTarget.year(),
            month: artistMonthlyTarget.month() + 1,
        }),
        hasTrackListenEventsInRange(targetDayDate, nextDayDate),
        hasTrackListenEventsInRange(
            completedTrackMonthDate,
            nextCompletedTrackMonthDate
        ),
        hasArtistListenEventsInRange(targetDayDate, nextDayDate),
        hasRecentListeningActivitiesInRange(targetDayDate, nextDayDate),
        hasArtistListenEventsInRange(
            artistMonthlyTarget.toDate(),
            nextArtistMonthlyTarget.toDate()
        ),
        Artist.exists({ activeStatus: "active" }),
    ]);

    const summary = [];

    if (shouldRunArtistDailyStatisticCatchup && hasArtistDailySourceData && !hasArtistDailyStats) {
        console.log(
            `[Startup Catch-up] Missing daily artist overview stats for ${targetDay.format("YYYY-MM-DD")}, running catch-up.`
        );
        summary.push("dailyArtistOverviewStat");
        await runDailyArtistOverviewStatAggregation();
    }

    if (
        shouldRunArtistDailyStatisticCatchup &&
        hasUserListeningDailySourceData &&
        !hasUserListeningDailyStats
    ) {
        console.log(
            `[Startup Catch-up] Missing daily user listening stats for ${targetDay.format("YYYY-MM-DD")}, running catch-up.`
        );
        summary.push("dailyUserListeningStat");
        await runUserListeningDailyStatAggregation();
    }

    if (shouldRunStatisticCatchup && hasTrackDailySourceData && !hasTrackDailyStats) {
        console.log(
            `[Startup Catch-up] Missing daily track stats for ${targetDay.format("YYYY-MM-DD")}, running catch-up.`
        );
        summary.push("dailyTrackStat");
        await runDailyTrackStatAggregation();
    }

    if (shouldRunStatisticCatchup && hasTrackMonthlySourceData && !hasTrackMonthlyStats) {
        console.log(
            `[Startup Catch-up] Missing monthly track stats for ${completedTrackMonth.format("YYYY-MM")}, running catch-up.`
        );
        summary.push("monthlyTrackStat");
        await runMonthlyTrackStatAggregation(completedTrackMonthKey);
    }

    const hasDailyTrackStatsAfterCatchup = Boolean(
        hasTrackDailyStats || (shouldRunStatisticCatchup && hasTrackDailySourceData)
    );
    const hasMonthlyTrackStatsAfterCatchup = Boolean(
        hasTrackMonthlyStats || (shouldRunStatisticCatchup && hasTrackMonthlySourceData)
    );

    if (shouldRunRankingCatchup && hasDailyTrackStatsAfterCatchup && !hasTrackDailyRanking) {
        console.log(
            `[Startup Catch-up] Missing daily top track ranking for ${targetDay.format("YYYY-MM-DD")}, running catch-up.`
        );
        summary.push("dailyTopTrack");
        await runDailyTopTrackAggregation();
    }

    if (shouldRunRankingCatchup && hasMonthlyTrackStatsAfterCatchup && !hasTrackMonthlyRanking) {
        console.log(
            `[Startup Catch-up] Missing monthly top track ranking for ${completedTrackMonth.format("YYYY-MM")}, running catch-up.`
        );
        summary.push("monthlyTopTrack");
        await runMonthlyTopTrackAggregation(completedTrackMonthKey);
    }

    if (
        shouldRunRankingCatchup &&
        (hasArtistDailySourceData || hasActiveArtists) &&
        !hasArtistDailyRanking
    ) {
        console.log(
            `[Startup Catch-up] Missing daily top artist ranking for ${targetDay.format("YYYY-MM-DD")}, running catch-up.`
        );
        summary.push("dailyTopArtist");
        await runDailyTopArtistAggregation();
    }

    if (
        shouldRunRankingCatchup &&
        (hasArtistMonthlySourceData || hasActiveArtists) &&
        !hasArtistMonthlyRanking
    ) {
        console.log(
            `[Startup Catch-up] Missing monthly top artist ranking for ${artistMonthlyTarget.format("YYYY-MM")}, running catch-up.`
        );
        summary.push("monthlyTopArtist");
        await runMonthlyTopArtistAggregation();
    }

    if (summary.length === 0) {
        console.log("[Startup Catch-up] No missing analytics jobs detected.");
    }

    return {
        timezone: analyticsTimezone,
        targetDay: targetDay.format("YYYY-MM-DD"),
        targetMonth: completedTrackMonth.format("YYYY-MM"),
        ranJobs: summary,
    };
};

export { runStartupAnalyticsCatchup };

export default {
    runStartupAnalyticsCatchup,
};
