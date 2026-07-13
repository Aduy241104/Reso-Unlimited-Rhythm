import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import Artist from "../../models/Artist.js";
import Track from "../../models/Track.js";
import TrackDailyStat from "../../models/TrackDailyStat.js";
import TrackMonthlyStat from "../../models/TrackMonthlyStat.js";
import { AppError } from "../../utils/AppError.js";
import {
    resolveAllTimeTrackPeriod,
    buildDailySummary,
    buildMonthlySummary,
    buildTrackPayload,
    clampPeriodToTrackReleaseDate,
    fillMissingDailyStats,
    fillRecentMonthlyChartStats,
    resolveLatestTimestamp,
    resolveOverviewPeriod,
} from "./trackAnalytics.helper.js";

export {
    buildDailySummary,
    fillMissingDailyStats,
    fillRecentMonthlyChartStats,
} from "./trackAnalytics.helper.js";

const resolveArtistProfile = async (userId) => {
    const artist = await Artist.findOne({ userId }).select("_id").lean();

    if (!artist) {
        throw new AppError("Artist profile not found.", StatusCodes.NOT_FOUND);
    }

    return artist;
};

const fetchTrackDailyStats = async ({ trackId, from, to }) => {
    const query = { trackId };

    if (from && to) {
        query.dateKey = {
            $gte: from,
            $lte: to,
        };
    }

    return TrackDailyStat.find(query)
        .sort({ dateKey: 1, _id: 1 })
        .select("dateKey date playCount uniqueListeners averageListenDuration skipCount updatedAt")
        .lean();
};

const fetchTrackMonthlyStats = async ({ trackId, year }) => {
    const query = { trackId };

    if (year !== undefined && year !== null) {
        query.year = year;
    }

    return TrackMonthlyStat.find(query)
        .sort({ year: 1, month: 1, _id: 1 })
        .select("year month playCount uniqueListeners revenue revenueAmount updatedAt")
        .lean();
};

export const validateTrackOwnership = async ({ artistId, trackId }) => {
    if (!mongoose.Types.ObjectId.isValid(trackId)) {
        throw new AppError("Invalid request data.", StatusCodes.BAD_REQUEST);
    }

    const track = await Track.findById(trackId)
        .select("_id title avatar coverImage duration artist_artistId releaseDate")
        .lean();

    if (!track) {
        throw new AppError("Track not found", StatusCodes.NOT_FOUND);
    }

    if (String(track.artist_artistId) !== String(artistId)) {
        throw new AppError(
            "You are not allowed to view analytics for this track",
            StatusCodes.FORBIDDEN
        );
    }

    return track;
};

export const getTrackAnalyticsOverview = async ({
    userId,
    trackId,
    range,
    from,
    to,
}) => {
    const requestedPeriod = resolveOverviewPeriod({ range, from, to });
    const artist = await resolveArtistProfile(userId);
    const track = await validateTrackOwnership({
        artistId: artist._id,
        trackId,
    });

    const [lifetimeStats, monthlyChartStats] = await Promise.all([
        fetchTrackDailyStats({ trackId }),
        fetchTrackMonthlyStats({ trackId }),
    ]);
    const period = requestedPeriod.range === "all"
        ? resolveAllTimeTrackPeriod(track, lifetimeStats, monthlyChartStats)
        : clampPeriodToTrackReleaseDate(requestedPeriod, track);
    const currentStats = requestedPeriod.range === "all"
        ? lifetimeStats
        : await fetchTrackDailyStats({ trackId, from: period.from, to: period.to });

    const summary = requestedPeriod.range === "all" &&
        currentStats.length === 0 &&
        monthlyChartStats.length > 0
        ? buildMonthlySummary(monthlyChartStats)
        : buildDailySummary(currentStats);

    return {
        track: buildTrackPayload(track),
        period,
        summary,
        lastUpdatedAt: resolveLatestTimestamp(
            lifetimeStats,
            currentStats,
            monthlyChartStats
        ),
        dailyChart: fillMissingDailyStats(currentStats, period.from, period.to),
        monthlyChart: fillRecentMonthlyChartStats(monthlyChartStats),
    };
};

export default {
    getTrackAnalyticsOverview,
    validateTrackOwnership,
    buildDailySummary,
    fillMissingDailyStats,
    fillRecentMonthlyChartStats,
};
