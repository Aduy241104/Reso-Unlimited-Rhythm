import mongoose from "mongoose";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { StatusCodes } from "http-status-codes";
import Artist from "../../models/Artist.js";
import Track from "../../models/Track.js";
import TrackDailyStat from "../../models/TrackDailyStat.js";
import TrackMonthlyStat from "../../models/TrackMonthlyStat.js";
import { getAnalyticsTimezone } from "../analytics/trackStatAggregation.service.js";
import { AppError } from "../../utils/AppError.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const DATE_KEY_FORMAT = "YYYY-MM-DD";
const DEFAULT_RANGE = "30d";
const ALLOWED_RANGES = new Set(["7d", "30d", "90d", "custom"]);
const MAX_DAILY_RANGE_DAYS = 365;

const roundToTwoDecimals = (value) => Number(Number(value || 0).toFixed(2));
const convertSecondsToMinutes = (value) => roundToTwoDecimals(Number(value || 0) / 60);

const isValidDateKey = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const parsed = dayjs.utc(`${value}T00:00:00Z`);
    return parsed.isValid() && parsed.format(DATE_KEY_FORMAT) === value;
};

const parseDateKey = (value) => dayjs.utc(`${value}T00:00:00Z`);

const formatDateKey = (dateValue) => dayjs.utc(dateValue).format(DATE_KEY_FORMAT);

const getTodayInAnalyticsTimezone = () =>
    dayjs().tz(getAnalyticsTimezone()).startOf("day");

const resolveArtistProfile = async (userId) => {
    const artist = await Artist.findOne({ userId }).select("_id").lean();

    if (!artist) {
        throw new AppError("Artist profile not found.", StatusCodes.NOT_FOUND);
    }

    return artist;
};

const ensureDateKey = (value) => {
    if (!isValidDateKey(value)) {
        throw new AppError("Invalid date range", StatusCodes.BAD_REQUEST);
    }

    return value;
};

const ensureDateRangeOrder = (from, to) => {
    if (parseDateKey(from).isAfter(parseDateKey(to))) {
        throw new AppError("Invalid date range", StatusCodes.BAD_REQUEST);
    }
};

const ensureDailyRangeLimit = (from, to) => {
    const totalDays = parseDateKey(to).diff(parseDateKey(from), "day") + 1;

    if (totalDays > MAX_DAILY_RANGE_DAYS) {
        throw new AppError("Invalid date range", StatusCodes.BAD_REQUEST);
    }
};

const resolveOverviewPeriod = ({ range, from, to }) => {
    const normalizedRange = String(range || DEFAULT_RANGE).trim();

    if (!ALLOWED_RANGES.has(normalizedRange)) {
        throw new AppError("Invalid analytics range", StatusCodes.BAD_REQUEST);
    }

    if (normalizedRange === "custom") {
        if (!from || !to) {
            throw new AppError("Invalid date range", StatusCodes.BAD_REQUEST);
        }

        const normalizedFrom = ensureDateKey(String(from).trim());
        const normalizedTo = ensureDateKey(String(to).trim());

        ensureDateRangeOrder(normalizedFrom, normalizedTo);

        return {
            from: normalizedFrom,
            to: normalizedTo,
            range: normalizedRange,
        };
    }

    const today = getTodayInAnalyticsTimezone();
    const dayCount = Number.parseInt(normalizedRange.replace("d", ""), 10);
    const fromDate = today.subtract(dayCount - 1, "day");

    return {
        from: fromDate.format(DATE_KEY_FORMAT),
        to: today.format(DATE_KEY_FORMAT),
        range: normalizedRange,
    };
};

const resolveExplicitPeriod = ({ from, to, enforceMaxRange = false }) => {
    if (!from || !to) {
        throw new AppError("Invalid date range", StatusCodes.BAD_REQUEST);
    }

    const normalizedFrom = ensureDateKey(String(from).trim());
    const normalizedTo = ensureDateKey(String(to).trim());

    ensureDateRangeOrder(normalizedFrom, normalizedTo);

    if (enforceMaxRange) {
        ensureDailyRangeLimit(normalizedFrom, normalizedTo);
    }

    return {
        from: normalizedFrom,
        to: normalizedTo,
    };
};

const resolveYear = (year) => {
    if (year === undefined || year === null || year === "") {
        return getTodayInAnalyticsTimezone().year();
    }

    const normalizedYear = Number.parseInt(year, 10);

    if (!Number.isInteger(normalizedYear) || normalizedYear < 2000 || normalizedYear > 9999) {
        throw new AppError("Invalid request data.", StatusCodes.BAD_REQUEST);
    }

    return normalizedYear;
};

const buildPreviousPeriod = ({ from, to }) => {
    const fromDate = parseDateKey(from);
    const toDate = parseDateKey(to);
    const totalDays = toDate.diff(fromDate, "day") + 1;
    const previousTo = fromDate.subtract(1, "day");
    const previousFrom = previousTo.subtract(totalDays - 1, "day");

    return {
        from: previousFrom.format(DATE_KEY_FORMAT),
        to: previousTo.format(DATE_KEY_FORMAT),
    };
};

const buildRecentDailyChartPeriod = ({ from, to, maxDays = 7 }) => {
    const fromDate = parseDateKey(from);
    const toDate = parseDateKey(to);
    const totalDays = toDate.diff(fromDate, "day") + 1;

    if (totalDays <= maxDays) {
        return { from, to };
    }

    return {
        from: toDate.subtract(maxDays - 1, "day").format(DATE_KEY_FORMAT),
        to,
    };
};

const buildLatestDailyChartPeriod = (maxDays = 7) => {
    const today = getTodayInAnalyticsTimezone();

    return {
        from: today.subtract(maxDays - 1, "day").format(DATE_KEY_FORMAT),
        to: today.format(DATE_KEY_FORMAT),
    };
};

const buildLatestMonthlyChartPeriod = (maxMonths = 12) => {
    const currentMonth = getTodayInAnalyticsTimezone().startOf("month");

    return {
        from: currentMonth.subtract(maxMonths - 1, "month"),
        to: currentMonth,
    };
};

const buildTrackPayload = (track) => ({
    id: String(track._id),
    title: track.title,
    avatar: track.avatar || "",
    coverImage: Array.isArray(track.coverImage) ? track.coverImage : [],
    duration: convertSecondsToMinutes(track.duration),
});

const normalizeStatDateKey = (stat) => {
    if (stat?.dateKey) {
        return stat.dateKey;
    }

    if (stat?.date) {
        return formatDateKey(stat.date);
    }

    return null;
};

const resolveLastUpdatedAt = (stats = []) => {
    const latestTimestamp = stats.reduce((latest, stat) => {
        if (!stat?.updatedAt) {
            return latest;
        }

        const currentTime = new Date(stat.updatedAt).getTime();

        if (Number.isNaN(currentTime)) {
            return latest;
        }

        return currentTime > latest ? currentTime : latest;
    }, 0);

    return latestTimestamp ? new Date(latestTimestamp).toISOString() : null;
};

const resolveLatestTimestamp = (...collections) =>
    resolveLastUpdatedAt(collections.flatMap((collection) => collection || []));

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
        .select("year month playCount uniqueListeners revenue updatedAt")
        .lean();
};

const sumDailyMetric = (stats, fieldName) =>
    stats.reduce((total, stat) => total + Number(stat?.[fieldName] || 0), 0);

export const buildDailySummary = (stats = []) => {
    const totalPlays = sumDailyMetric(stats, "playCount");
    const uniqueListeners = sumDailyMetric(stats, "uniqueListeners");
    const skipCount = sumDailyMetric(stats, "skipCount");
    const totalListeningTimeInSeconds = roundToTwoDecimals(
        stats.reduce(
            (total, stat) =>
                total +
                Number(stat?.playCount || 0) *
                    Number(stat?.averageListenDuration || 0),
            0
        )
    );
    const averageListenDurationInSeconds = totalPlays
        ? roundToTwoDecimals(totalListeningTimeInSeconds / totalPlays)
        : 0;
    const totalListeningTime = convertSecondsToMinutes(totalListeningTimeInSeconds);
    const averageListenDuration = convertSecondsToMinutes(
        averageListenDurationInSeconds
    );
    const skipRate = totalPlays
        ? roundToTwoDecimals((skipCount / totalPlays) * 100)
        : 0;

    return {
        totalPlays,
        uniqueListeners,
        totalListeningTime,
        averageListenDuration,
        skipCount,
        skipRate,
    };
};

export const calculateChangePercent = (current, previous) => {
    if (previous === 0) {
        return current > 0 ? 100 : 0;
    }

    return roundToTwoDecimals(((current - previous) / previous) * 100);
};

export const buildComparison = (
    currentSummary,
    previousSummary,
    metricMap = {
        totalPlays: "totalPlays",
        uniqueListeners: "uniqueListeners",
        averageListenDuration: "averageListenDuration",
        skipRate: "skipRate",
    }
) =>
    Object.entries(metricMap).reduce((comparison, [responseKey, summaryKey]) => {
        const currentValue = Number(currentSummary?.[summaryKey] || 0);
        const previousValue = Number(previousSummary?.[summaryKey] || 0);

        comparison[responseKey] = {
            current: currentValue,
            previous: previousValue,
            changePercent: calculateChangePercent(currentValue, previousValue),
            trend:
                currentValue > previousValue
                    ? "up"
                    : currentValue < previousValue
                        ? "down"
                        : "same",
        };

        return comparison;
    }, {});

export const fillMissingDailyStats = (stats = [], from, to) => {
    const statMap = new Map(
        stats
            .map((stat) => [normalizeStatDateKey(stat), stat])
            .filter(([dateKey]) => Boolean(dateKey))
    );

    const filledStats = [];
    let currentDate = parseDateKey(from);
    const endDate = parseDateKey(to);

    while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, "day")) {
        const dateKey = currentDate.format(DATE_KEY_FORMAT);
        const stat = statMap.get(dateKey);

        filledStats.push({
            date: dateKey,
            playCount: Number(stat?.playCount || 0),
            uniqueListeners: Number(stat?.uniqueListeners || 0),
            averageListenDuration: convertSecondsToMinutes(
                Number(stat?.averageListenDuration || 0)
            ),
            skipCount: Number(stat?.skipCount || 0),
        });

        currentDate = currentDate.add(1, "day");
    }

    return filledStats;
};

export const fillMissingMonthlyStats = (stats = [], year) => {
    const statMap = new Map(stats.map((stat) => [Number(stat.month), stat]));

    return Array.from({ length: 12 }, (_, index) => {
        const month = index + 1;
        const stat = statMap.get(month);
        const revenue = stat?.revenue || {};

        return {
            month,
            playCount: Number(stat?.playCount || 0),
            uniqueListeners: Number(stat?.uniqueListeners || 0),
            eligibleStreams: Number(revenue.eligibleStreams || 0),
            artistRevenueAmount: roundToTwoDecimals(
                Number(revenue.artistRevenueAmount || 0)
            ),
            year,
        };
    }).map(({ year: _year, ...rest }) => rest);
};

export const fillRecentMonthlyChartStats = (stats = [], maxMonths = 12) => {
    const statMap = new Map(
        stats.map((stat) => [`${stat.year}-${String(stat.month).padStart(2, "0")}`, stat])
    );
    const { from, to } = buildLatestMonthlyChartPeriod(maxMonths);
    const filledStats = [];
    let currentMonth = from;

    while (
        currentMonth.isBefore(to, "month") ||
        currentMonth.isSame(to, "month")
    ) {
        const year = currentMonth.year();
        const month = currentMonth.month() + 1;
        const monthKey = `${year}-${String(month).padStart(2, "0")}`;
        const stat = statMap.get(monthKey);
        const revenue = stat?.revenue || {};

        filledStats.push({
            month: monthKey,
            year,
            monthNumber: month,
            playCount: Number(stat?.playCount || 0),
            uniqueListeners: Number(stat?.uniqueListeners || 0),
            eligibleStreams: Number(revenue.eligibleStreams || 0),
            artistRevenueAmount: roundToTwoDecimals(
                Number(revenue.artistRevenueAmount || 0)
            ),
        });

        currentMonth = currentMonth.add(1, "month");
    }

    return filledStats;
};

export const validateTrackOwnership = async ({ artistId, trackId }) => {
    if (!mongoose.Types.ObjectId.isValid(trackId)) {
        throw new AppError("Invalid request data.", StatusCodes.BAD_REQUEST);
    }

    const track = await Track.findById(trackId)
        .select("_id title avatar coverImage duration artist_artistId")
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
    const period = resolveOverviewPeriod({ range, from, to });
    const artist = await resolveArtistProfile(userId);
    const track = await validateTrackOwnership({
        artistId: artist._id,
        trackId,
    });
    const dailyChartPeriod = buildLatestDailyChartPeriod();

    const [currentStats, lifetimeStats, dailyChartStats, monthlyChartStats] = await Promise.all([
        fetchTrackDailyStats({ trackId, from: period.from, to: period.to }),
        fetchTrackDailyStats({ trackId }),
        fetchTrackDailyStats({
            trackId,
            from: dailyChartPeriod.from,
            to: dailyChartPeriod.to,
        }),
        fetchTrackMonthlyStats({ trackId }),
    ]);

    const summary = buildDailySummary(currentStats);
    const lifetimeSummary = buildDailySummary(lifetimeStats);

    return {
        track: buildTrackPayload(track),
        period,
        summary: {
            ...summary,
            totalListeningTime: lifetimeSummary.totalListeningTime,
        },
        lastUpdatedAt: resolveLatestTimestamp(
            lifetimeStats,
            dailyChartStats,
            monthlyChartStats
        ),
        dailyChart: fillMissingDailyStats(
            dailyChartStats,
            dailyChartPeriod.from,
            dailyChartPeriod.to
        ),
        monthlyChart: fillRecentMonthlyChartStats(monthlyChartStats),
    };
};

export const getTrackDailyAnalytics = async ({
    userId,
    trackId,
    from,
    to,
}) => {
    const period = resolveExplicitPeriod({
        from,
        to,
        enforceMaxRange: true,
    });
    const artist = await resolveArtistProfile(userId);
    await validateTrackOwnership({
        artistId: artist._id,
        trackId,
    });
    const stats = await fetchTrackDailyStats({
        trackId,
        from: period.from,
        to: period.to,
    });

    return {
        trackId,
        from: period.from,
        to: period.to,
        lastUpdatedAt: resolveLastUpdatedAt(stats),
        dailyStats: fillMissingDailyStats(stats, period.from, period.to),
    };
};

export const getTrackMonthlyAnalytics = async ({
    userId,
    trackId,
    year,
}) => {
    const normalizedYear = resolveYear(year);
    const artist = await resolveArtistProfile(userId);
    await validateTrackOwnership({
        artistId: artist._id,
        trackId,
    });
    const stats = await fetchTrackMonthlyStats({
        trackId,
        year: normalizedYear,
    });

    return {
        trackId,
        year: normalizedYear,
        lastUpdatedAt: resolveLastUpdatedAt(stats),
        monthlyStats: fillMissingMonthlyStats(stats, normalizedYear),
    };
};

export const compareTrackPerformance = async ({
    userId,
    trackId,
    currentFrom,
    currentTo,
    previousFrom,
    previousTo,
}) => {
    const currentPeriod = resolveExplicitPeriod({
        from: currentFrom,
        to: currentTo,
    });
    const previousPeriod = resolveExplicitPeriod({
        from: previousFrom,
        to: previousTo,
    });
    const artist = await resolveArtistProfile(userId);
    await validateTrackOwnership({
        artistId: artist._id,
        trackId,
    });

    const [currentStats, previousStats] = await Promise.all([
        fetchTrackDailyStats({
            trackId,
            from: currentPeriod.from,
            to: currentPeriod.to,
        }),
        fetchTrackDailyStats({
            trackId,
            from: previousPeriod.from,
            to: previousPeriod.to,
        }),
    ]);

    const currentSummary = buildDailySummary(currentStats);
    const previousSummary = buildDailySummary(previousStats);

    return {
        trackId,
        currentPeriod,
        previousPeriod,
        lastUpdatedAt: resolveLastUpdatedAt([...currentStats, ...previousStats]),
        metrics: buildComparison(currentSummary, previousSummary, {
            playCount: "totalPlays",
            uniqueListeners: "uniqueListeners",
            averageListenDuration: "averageListenDuration",
            skipRate: "skipRate",
        }),
    };
};

export default {
    getTrackAnalyticsOverview,
    getTrackDailyAnalytics,
    getTrackMonthlyAnalytics,
    compareTrackPerformance,
    validateTrackOwnership,
    buildDailySummary,
    calculateChangePercent,
    buildComparison,
    fillMissingDailyStats,
    fillMissingMonthlyStats,
    fillRecentMonthlyChartStats,
};
