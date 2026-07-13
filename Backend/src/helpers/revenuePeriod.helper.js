import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../utils/AppError.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const DEFAULT_ARTIST_REVENUE_SHARE_PERCENT = 60;
const normalizeRevenueSharePercent = (rawValue) => {
    const parsedValue = Number(rawValue);

    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
        return DEFAULT_ARTIST_REVENUE_SHARE_PERCENT;
    }

    if (parsedValue <= 1) {
        return parsedValue * 100;
    }

    if (parsedValue <= 100) {
        return parsedValue;
    }

    return DEFAULT_ARTIST_REVENUE_SHARE_PERCENT;
};

export const ARTIST_REVENUE_SHARE_PERCENT = Number(
    normalizeRevenueSharePercent(
        process.env.ARTIST_REVENUE_SHARE_PERCENT
    ).toFixed(2)
);
export const ARTIST_REVENUE_SHARE_RATIO = ARTIST_REVENUE_SHARE_PERCENT / 100;
export const PLATFORM_REVENUE_SHARE_PERCENT = Number(
    Math.max(100 - ARTIST_REVENUE_SHARE_PERCENT, 0).toFixed(2)
);

const MIN_REVENUE_YEAR = 2000;

export const getRevenueDashboardTimezone = () =>
    process.env.ANALYTICS_TIMEZONE ||
    process.env.CRON_TIMEZONE ||
    "Asia/Ho_Chi_Minh";

const parseRevenueYear = (rawYear, defaultYear) => {
    if (typeof rawYear === "undefined" || rawYear === null || rawYear === "") {
        return defaultYear;
    }

    const year = Number(rawYear);

    if (!Number.isInteger(year) || year < MIN_REVENUE_YEAR) {
        throw new AppError(
            `Invalid year. Year must be a valid integer greater than or equal to ${MIN_REVENUE_YEAR}.`,
            StatusCodes.BAD_REQUEST,
            { field: "year" }
        );
    }

    return year;
};

const parseRevenueMonth = (rawMonth, defaultMonth) => {
    if (typeof rawMonth === "undefined" || rawMonth === null || rawMonth === "") {
        return defaultMonth;
    }

    const month = Number(rawMonth);

    if (!Number.isInteger(month) || month < 1 || month > 12) {
        throw new AppError(
            "Invalid month. Month must be between 1 and 12.",
            StatusCodes.BAD_REQUEST,
            { field: "month" }
        );
    }

    return month;
};

export const normalizeRevenueDashboardPeriod = (query = {}) => {
    const timezoneName = getRevenueDashboardTimezone();
    const now = dayjs().tz(timezoneName);

    const currentYear = now.year();
    const currentMonth = now.month() + 1;

    return {
        year: parseRevenueYear(query.year, currentYear),
        month: parseRevenueMonth(query.month, currentMonth),
        currentYear,
        currentMonth,
        timezone: timezoneName,
    };
};

export const buildRevenuePeriodRange = (year, month, timezoneName = getRevenueDashboardTimezone()) => {
    const periodStart = dayjs()
        .tz(timezoneName)
        .year(year)
        .month(month - 1)
        .startOf("month");
    const periodEnd = periodStart.add(1, "month");

    return {
        periodStart: periodStart.toDate(),
        periodEnd: periodEnd.toDate(),
    };
};

export const resolveRevenuePeriodStatus = ({
    revenuePeriodStatus,
    selectedYear,
    selectedMonth,
    currentYear,
    currentMonth,
}) => {
    if (revenuePeriodStatus) {
        return revenuePeriodStatus;
    }

    return selectedYear === currentYear && selectedMonth === currentMonth
        ? "open"
        : "not_created";
};
