import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { StatusCodes } from "http-status-codes";
import { getAnalyticsTimezone } from "../analytics/trackStatAggregation.service.js";
import { AppError } from "../../utils/AppError.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const DATE_KEY_FORMAT = "YYYY-MM-DD";
const DEFAULT_RANGE = "30d";
const ALLOWED_RANGES = new Set(["7d", "30d", "90d", "custom"]);

const roundToTwoDecimals = (value) => Number(Number(value || 0).toFixed(2));

const convertSecondsToMinutes = (value) =>
    roundToTwoDecimals(Number(value || 0) / 60);

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

export const resolveOverviewPeriod = ({ range, from, to }) => {
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

const buildLatestMonthlyChartPeriod = (maxMonths = 12) => {
    const currentMonth = getTodayInAnalyticsTimezone().startOf("month");

    return {
        from: currentMonth.subtract(maxMonths - 1, "month"),
        to: currentMonth,
    };
};

export const buildTrackPayload = (track) => ({
    id: String(track._id),
    title: track.title,
    avatar: track.avatar || "",
    coverImage: Array.isArray(track.coverImage) ? track.coverImage : [],
    duration: convertSecondsToMinutes(track.duration),
});

const resolveTrackReleaseDateKey = (track) => {
    if (!track?.releaseDate) {
        return null;
    }

    const releaseDate = dayjs(track.releaseDate)
        .tz(getAnalyticsTimezone())
        .startOf("day");

    return releaseDate.isValid() ? releaseDate.format(DATE_KEY_FORMAT) : null;
};

export const clampPeriodToTrackReleaseDate = (period, track) => {
    const releaseDateKey = resolveTrackReleaseDateKey(track);

    if (!releaseDateKey || parseDateKey(releaseDateKey).isBefore(parseDateKey(period.from))) {
        return period;
    }

    if (parseDateKey(releaseDateKey).isAfter(parseDateKey(period.to))) {
        return {
            ...period,
            from: releaseDateKey,
            to: releaseDateKey,
        };
    }

    return {
        ...period,
        from: releaseDateKey,
    };
};

const normalizeStatDateKey = (stat) => {
    if (stat?.dateKey) {
        return stat.dateKey;
    }

    if (stat?.date) {
        return formatDateKey(stat.date);
    }

    return null;
};

export const resolveLastUpdatedAt = (stats = []) => {
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

export const resolveLatestTimestamp = (...collections) =>
    resolveLastUpdatedAt(collections.flatMap((collection) => collection || []));

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

export const fillRecentMonthlyChartStats = (stats = [], maxMonths = 12) => {
    const statMap = new Map(
        stats.map((stat) => [
            `${stat.year}-${String(stat.month).padStart(2, "0")}`,
            stat,
        ])
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
        const artistRevenueAmount =
            revenue.artistRevenueAmount ||
            revenue.revenueAmount ||
            stat?.revenueAmount ||
            0;

        filledStats.push({
            month: monthKey,
            year,
            monthNumber: month,
            playCount: Number(stat?.playCount || 0),
            uniqueListeners: Number(stat?.uniqueListeners || 0),
            eligibleStreams: Number(revenue.eligibleStreams || 0),
            artistRevenueAmount: roundToTwoDecimals(Number(artistRevenueAmount)),
        });

        currentMonth = currentMonth.add(1, "month");
    }

    return filledStats;
};

export default {
    buildDailySummary,
    buildTrackPayload,
    clampPeriodToTrackReleaseDate,
    fillMissingDailyStats,
    fillRecentMonthlyChartStats,
    resolveLastUpdatedAt,
    resolveLatestTimestamp,
    resolveOverviewPeriod,
};
