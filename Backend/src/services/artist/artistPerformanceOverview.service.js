import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { StatusCodes } from "http-status-codes";
import Artist from "../../models/Artist.js";
import ArtistDailyStat from "../../models/ArtistDailyStat.js";
import ListenEvent from "../../models/ListenEvent.js";
import Track from "../../models/Track.js";
import User from "../../models/User.js";
import { getAnalyticsTimezone } from "../analytics/trackStatAggregation.service.js";
import { AppError } from "../../utils/AppError.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const DATE_KEY_FORMAT = "YYYY-MM-DD";
const DEFAULT_RANGE = "30d";
const ALLOWED_RANGES = new Set(["7d", "30d", "all"]);
const YEAR_SERIES_LENGTH = 5;
const UNKNOWN_REGION_LABEL = "Không xác định";
const UNKNOWN_AGE_GROUP_KEY = "unknown";

const roundToTwoDecimals = (value) => Number(Number(value || 0).toFixed(2));

const getTodayInAnalyticsTimezone = () =>
    dayjs().tz(getAnalyticsTimezone()).startOf("day");

const resolveSnapshotAndLiveBoundaries = ({ startDate, endDateExclusive }) => {
    const todayStart = getTodayInAnalyticsTimezone();
    const snapshotEndDateExclusive = todayStart.toDate();
    const liveStartDate =
        endDateExclusive > snapshotEndDateExclusive
            ? new Date(
                Math.max(startDate.getTime(), snapshotEndDateExclusive.getTime())
            )
            : null;

    return {
        todayStart,
        snapshotEndDateExclusive,
        liveStartDate,
    };
};

const resolveArtistProfile = async (userId) => {
    const artist = await Artist.findOne({ userId }).select("_id name stats").lean();

    if (!artist) {
        throw new AppError("Artist profile not found.", StatusCodes.NOT_FOUND);
    }

    return artist;
};

const resolveRange = (range) => {
    const normalizedRange = String(range || DEFAULT_RANGE).trim();

    if (!ALLOWED_RANGES.has(normalizedRange)) {
        throw new AppError("Invalid analytics range", StatusCodes.BAD_REQUEST);
    }

    return normalizedRange;
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

const resolveAllTimePeriod = async (artistId) => {
    const [result] = await ListenEvent.aggregate([
        {
            $match: {
                artistId,
                isValidStream: true,
                listenedAt: { $exists: true, $ne: null },
            },
        },
        {
            $group: {
                _id: null,
                earliestListenedAt: { $min: "$listenedAt" },
            },
        },
        {
            $project: {
                _id: 0,
                earliestListenedAt: 1,
            },
        },
    ]);

    const today = getTodayInAnalyticsTimezone();
    const from = result?.earliestListenedAt
        ? dayjs(result.earliestListenedAt)
            .tz(getAnalyticsTimezone())
            .startOf("day")
        : today;

    return {
        from,
        to: today,
        range: "all",
        fromDateKey: from.format(DATE_KEY_FORMAT),
        toDateKey: today.format(DATE_KEY_FORMAT),
        startDate: from.toDate(),
        endDateExclusive: today.add(1, "day").toDate(),
    };
};

const resolveRangePeriod = (range) => {
    const today = getTodayInAnalyticsTimezone();
    const dayCount = Number.parseInt(range.replace("d", ""), 10);
    const from = today.subtract(dayCount - 1, "day");

    return {
        from,
        to: today,
        range,
        fromDateKey: from.format(DATE_KEY_FORMAT),
        toDateKey: today.format(DATE_KEY_FORMAT),
        startDate: from.toDate(),
        endDateExclusive: today.add(1, "day").toDate(),
    };
};

const resolveMonthlyPeriod = (year) => {
    const timezoneName = getAnalyticsTimezone();
    const from = dayjs.tz(`${year}-01-01`, timezoneName).startOf("year");

    return {
        startDate: from.toDate(),
        endDateExclusive: from.add(1, "year").toDate(),
    };
};

const buildYearSeries = (currentYear, length = YEAR_SERIES_LENGTH) =>
    Array.from({ length }, (_, index) => currentYear - length + index + 1);

const resolveYearlyPeriod = (currentYear) => {
    const timezoneName = getAnalyticsTimezone();
    const firstYear = currentYear - YEAR_SERIES_LENGTH + 1;
    const from = dayjs.tz(`${firstYear}-01-01`, timezoneName).startOf("year");

    return {
        startDate: from.toDate(),
        endDateExclusive: dayjs
            .tz(`${currentYear + 1}-01-01`, timezoneName)
            .startOf("year")
            .toDate(),
    };
};

const resolveCurrentMonthPeriod = () => {
    const today = getTodayInAnalyticsTimezone();
    const from = today.startOf("month");

    return {
        startDate: from.toDate(),
        endDateExclusive: from.add(1, "month").toDate(),
    };
};

const resolveCurrentYearPeriod = () => {
    const today = getTodayInAnalyticsTimezone();
    const from = today.startOf("year");

    return {
        startDate: from.toDate(),
        endDateExclusive: from.add(1, "year").toDate(),
    };
};

const resolveAllTimeSummaryPeriod = () => ({
    startDate: new Date(0),
    endDateExclusive: getTodayInAnalyticsTimezone().add(1, "day").toDate(),
});

const aggregatePeriodSummary = async ({ artistId, startDate, endDateExclusive }) => {
    const [summary] = await ListenEvent.aggregate([
        {
            $match: {
                artistId,
                isValidStream: true,
                listenedAt: {
                    $gte: startDate,
                    $lt: endDateExclusive,
                },
            },
        },
        {
            $group: {
                _id: null,
                streamCount: { $sum: 1 },
                uniqueListeners: { $addToSet: "$userId" },
            },
        },
        {
            $project: {
                _id: 0,
                streamCount: 1,
                uniqueListeners: { $size: "$uniqueListeners" },
            },
        },
    ]);

    return {
        streamCount: Number(summary?.streamCount || 0),
        uniqueListeners: Number(summary?.uniqueListeners || 0),
    };
};

const aggregatePeriodStreamCount = async ({
    artistId,
    startDate,
    endDateExclusive,
}) => {
    const {
        snapshotEndDateExclusive,
        liveStartDate,
    } = resolveSnapshotAndLiveBoundaries({ startDate, endDateExclusive });

    const [snapshotSummary, liveSummary] = await Promise.all([
        startDate < snapshotEndDateExclusive
            ? ArtistDailyStat.aggregate([
                {
                    $match: {
                        artistId,
                        date: {
                            $gte: startDate,
                            $lt: snapshotEndDateExclusive,
                        },
                    },
                },
                {
                    $group: {
                        _id: null,
                        streamCount: { $sum: "$streamCount" },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        streamCount: 1,
                    },
                },
            ])
            : Promise.resolve([]),
        liveStartDate
            ? ListenEvent.aggregate([
                {
                    $match: {
                        artistId,
                        isValidStream: true,
                        listenedAt: {
                            $gte: liveStartDate,
                            $lt: endDateExclusive,
                        },
                    },
                },
                {
                    $group: {
                        _id: null,
                        streamCount: { $sum: 1 },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        streamCount: 1,
                    },
                },
            ])
            : Promise.resolve([]),
    ]);

    return Number(snapshotSummary?.[0]?.streamCount || 0) +
        Number(liveSummary?.[0]?.streamCount || 0);
};

const aggregateDailyStats = async ({ artistId, startDate, endDateExclusive }) =>
    (async () => {
        const {
            todayStart,
            snapshotEndDateExclusive,
            liveStartDate,
        } = resolveSnapshotAndLiveBoundaries({ startDate, endDateExclusive });
        const [snapshotStats, liveStats] = await Promise.all([
            startDate < snapshotEndDateExclusive
                ? ArtistDailyStat.find({
                    artistId,
                    date: {
                        $gte: startDate,
                        $lt: snapshotEndDateExclusive,
                    },
                })
                    .sort({ dateKey: 1, _id: 1 })
                    .select("dateKey streamCount uniqueListeners")
                    .lean()
                : Promise.resolve([]),
            liveStartDate
                ? ListenEvent.aggregate([
                    {
                        $match: {
                            artistId,
                            isValidStream: true,
                            listenedAt: {
                                $gte: liveStartDate,
                                $lt: endDateExclusive,
                            },
                        },
                    },
                    {
                        $group: {
                            _id: {
                                $dateToString: {
                                    format: "%Y-%m-%d",
                                    date: "$listenedAt",
                                    timezone: getAnalyticsTimezone(),
                                },
                            },
                            streamCount: { $sum: 1 },
                            uniqueListeners: { $addToSet: "$userId" },
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            date: "$_id",
                            streamCount: 1,
                            uniqueListeners: { $size: "$uniqueListeners" },
                        },
                    },
                    {
                        $sort: {
                            date: 1,
                        },
                    },
                ])
                : Promise.resolve([]),
        ]);

        const normalizedSnapshotStats = snapshotStats.map((stat) => ({
            date: stat.dateKey,
            streamCount: Number(stat.streamCount || 0),
            uniqueListeners: Number(stat.uniqueListeners || 0),
        }));

        if (!liveStartDate) {
            return normalizedSnapshotStats;
        }

        const liveDateKey = todayStart.format(DATE_KEY_FORMAT);
        const liveMap = new Map(liveStats.map((stat) => [stat.date, stat]));

        return [
            ...normalizedSnapshotStats,
            {
                date: liveDateKey,
                streamCount: Number(liveMap.get(liveDateKey)?.streamCount || 0),
                uniqueListeners: Number(liveMap.get(liveDateKey)?.uniqueListeners || 0),
            },
        ];
    })();

const fillMissingDailyStats = ({ stats = [], from, to }) => {
    const statMap = new Map(
        stats.map((stat) => [String(stat.date), stat])
    );
    const filledStats = [];
    let cursor = from.startOf("day");

    while (cursor.isBefore(to) || cursor.isSame(to, "day")) {
        const dateKey = cursor.format(DATE_KEY_FORMAT);
        const stat = statMap.get(dateKey);

        filledStats.push({
            date: dateKey,
            streamCount: Number(stat?.streamCount || 0),
            uniqueListeners: Number(stat?.uniqueListeners || 0),
        });

        cursor = cursor.add(1, "day");
    }

    return filledStats;
};

const aggregateMonthlyStats = async ({ artistId, startDate, endDateExclusive }) =>
    (async () => {
        const {
            snapshotEndDateExclusive,
            liveStartDate,
        } = resolveSnapshotAndLiveBoundaries({ startDate, endDateExclusive });
        const [snapshotStats, liveStats] = await Promise.all([
            startDate < snapshotEndDateExclusive
                ? ArtistDailyStat.aggregate([
                    {
                        $match: {
                            artistId,
                            date: {
                                $gte: startDate,
                                $lt: snapshotEndDateExclusive,
                            },
                        },
                    },
                    {
                        $group: {
                            _id: {
                                $month: {
                                    date: "$date",
                                    timezone: getAnalyticsTimezone(),
                                },
                            },
                            streamCount: { $sum: "$streamCount" },
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            month: "$_id",
                            streamCount: 1,
                        },
                    },
                    {
                        $sort: {
                            month: 1,
                        },
                    },
                ])
                : Promise.resolve([]),
            liveStartDate
                ? ListenEvent.aggregate([
                    {
                        $match: {
                            artistId,
                            isValidStream: true,
                            listenedAt: {
                                $gte: liveStartDate,
                                $lt: endDateExclusive,
                            },
                        },
                    },
                    {
                        $group: {
                            _id: {
                                $month: {
                                    date: "$listenedAt",
                                    timezone: getAnalyticsTimezone(),
                                },
                            },
                            streamCount: { $sum: 1 },
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            month: "$_id",
                            streamCount: 1,
                        },
                    },
                ])
                : Promise.resolve([]),
        ]);

        const statMap = new Map(
            snapshotStats.map((stat) => [Number(stat.month), Number(stat.streamCount || 0)])
        );

        liveStats.forEach((stat) => {
            const month = Number(stat.month);
            statMap.set(
                month,
                Number(statMap.get(month) || 0) + Number(stat.streamCount || 0)
            );
        });

        return [...statMap.entries()]
            .map(([month, streamCount]) => ({
                month,
                streamCount,
            }))
            .sort((left, right) => left.month - right.month);
    })();

const fillMissingMonthlyStats = ({ stats = [], year }) => {
    const statMap = new Map(stats.map((stat) => [Number(stat.month), stat]));

    return Array.from({ length: 12 }, (_, index) => {
        const month = index + 1;
        const stat = statMap.get(month);

        return {
            month,
            monthKey: `${year}-${String(month).padStart(2, "0")}`,
            streamCount: Number(stat?.streamCount || 0),
        };
    });
};

const aggregateYearlyStats = async ({ artistId, startDate, endDateExclusive }) =>
    (async () => {
        const {
            snapshotEndDateExclusive,
            liveStartDate,
        } = resolveSnapshotAndLiveBoundaries({ startDate, endDateExclusive });
        const [snapshotStats, liveStats] = await Promise.all([
            startDate < snapshotEndDateExclusive
                ? ArtistDailyStat.aggregate([
                    {
                        $match: {
                            artistId,
                            date: {
                                $gte: startDate,
                                $lt: snapshotEndDateExclusive,
                            },
                        },
                    },
                    {
                        $group: {
                            _id: {
                                $year: {
                                    date: "$date",
                                    timezone: getAnalyticsTimezone(),
                                },
                            },
                            streamCount: { $sum: "$streamCount" },
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            year: "$_id",
                            streamCount: 1,
                        },
                    },
                    {
                        $sort: {
                            year: 1,
                        },
                    },
                ])
                : Promise.resolve([]),
            liveStartDate
                ? ListenEvent.aggregate([
                    {
                        $match: {
                            artistId,
                            isValidStream: true,
                            listenedAt: {
                                $gte: liveStartDate,
                                $lt: endDateExclusive,
                            },
                        },
                    },
                    {
                        $group: {
                            _id: {
                                $year: {
                                    date: "$listenedAt",
                                    timezone: getAnalyticsTimezone(),
                                },
                            },
                            streamCount: { $sum: 1 },
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            year: "$_id",
                            streamCount: 1,
                        },
                    },
                ])
                : Promise.resolve([]),
        ]);

        const statMap = new Map(
            snapshotStats.map((stat) => [Number(stat.year), Number(stat.streamCount || 0)])
        );

        liveStats.forEach((stat) => {
            const year = Number(stat.year);
            statMap.set(
                year,
                Number(statMap.get(year) || 0) + Number(stat.streamCount || 0)
            );
        });

        return [...statMap.entries()]
            .map(([year, streamCount]) => ({
                year,
                streamCount,
            }))
            .sort((left, right) => left.year - right.year);
    })();

const fillMissingYearlyStats = ({ stats = [], years = [] }) => {
    const statMap = new Map(stats.map((stat) => [Number(stat.year), stat]));

    return years.map((year) => ({
        year,
        month: String(year),
        streamCount: Number(statMap.get(year)?.streamCount || 0),
    }));
};

const aggregateAvailableYears = async ({ artistId }) => {
    const results = await ListenEvent.aggregate([
        {
            $match: {
                artistId,
                isValidStream: true,
            },
        },
        {
            $group: {
                _id: {
                    $year: {
                        date: "$listenedAt",
                        timezone: getAnalyticsTimezone(),
                    },
                },
            },
        },
        {
            $project: {
                _id: 0,
                year: "$_id",
            },
        },
        {
            $sort: {
                year: -1,
            },
        },
    ]);

    const years = results
        .map((item) => Number(item?.year))
        .filter((year) => Number.isInteger(year));

    if (years.length > 0) {
        return years;
    }

    return [getTodayInAnalyticsTimezone().year()];
};

const buildAgeGroupConfig = () => [
    {
        key: "under_18",
        label: "Dưới 18",
        test: (age) => age < 18,
    },
    {
        key: "18_24",
        label: "18 - 24",
        test: (age) => age >= 18 && age <= 24,
    },
    {
        key: "25_34",
        label: "25 - 34",
        test: (age) => age >= 25 && age <= 34,
    },
    {
        key: "35_44",
        label: "35 - 44",
        test: (age) => age >= 35 && age <= 44,
    },
    {
        key: "45_54",
        label: "45 - 54",
        test: (age) => age >= 45 && age <= 54,
    },
    {
        key: "55_plus",
        label: "55+",
        test: (age) => age >= 55,
    },
];

const createBreakdownItem = ({ key, label, count, total }) => ({
    key,
    label,
    count,
    percentage: total > 0 ? roundToTwoDecimals((count / total) * 100) : 0,
});

const resolveAgeGroupKey = (dateOfBirth, referenceDate) => {
    if (!dateOfBirth) {
        return UNKNOWN_AGE_GROUP_KEY;
    }

    const birthDate = dayjs(dateOfBirth);

    if (!birthDate.isValid()) {
        return UNKNOWN_AGE_GROUP_KEY;
    }

    const age = referenceDate.diff(birthDate, "year");

    if (!Number.isInteger(age) || age < 0) {
        return UNKNOWN_AGE_GROUP_KEY;
    }

    const match = buildAgeGroupConfig().find((group) => group.test(age));
    return match?.key || UNKNOWN_AGE_GROUP_KEY;
};

const buildAgeGroupBreakdown = ({ listeners = [], referenceDate }) => {
    const groups = buildAgeGroupConfig();
    const counts = new Map(groups.map((group) => [group.key, 0]));
    counts.set(UNKNOWN_AGE_GROUP_KEY, 0);

    listeners.forEach((listener) => {
        const groupKey = resolveAgeGroupKey(listener?.dateOfBirth, referenceDate);
        counts.set(groupKey, Number(counts.get(groupKey) || 0) + 1);
    });

    return [
        ...groups.map((group) =>
            createBreakdownItem({
                key: group.key,
                label: group.label,
                count: Number(counts.get(group.key) || 0),
                total: listeners.length,
            })
        ),
        createBreakdownItem({
            key: UNKNOWN_AGE_GROUP_KEY,
            label: "Không xác định",
            count: Number(counts.get(UNKNOWN_AGE_GROUP_KEY) || 0),
            total: listeners.length,
        }),
    ];
};

const buildRegionBreakdown = ({ listeners = [] }) => {
    const regionCounts = listeners.reduce((accumulator, listener) => {
        const regionLabel = String(
            listener?.country || UNKNOWN_REGION_LABEL
        ).trim() || UNKNOWN_REGION_LABEL;

        accumulator.set(regionLabel, Number(accumulator.get(regionLabel) || 0) + 1);
        return accumulator;
    }, new Map());

    return [...regionCounts.entries()]
        .map(([label, count]) =>
            createBreakdownItem({
                key: label,
                label,
                count,
                total: listeners.length,
            })
        )
        .sort((left, right) => {
            if (right.count !== left.count) {
                return right.count - left.count;
            }

            return left.label.localeCompare(right.label);
        });
};

const aggregateAudienceProfiles = async ({ artistId, startDate, endDateExclusive }) => {
    const uniqueListeners = await ListenEvent.aggregate([
        {
            $match: {
                artistId,
                isValidStream: true,
                userId: { $exists: true, $ne: null },
                listenedAt: {
                    $gte: startDate,
                    $lt: endDateExclusive,
                },
            },
        },
        {
            $sort: {
                listenedAt: -1,
            },
        },
        {
            $group: {
                _id: "$userId",
            },
        },
    ]);

    if (uniqueListeners.length === 0) {
        return [];
    }

    const userIds = uniqueListeners.map((listener) => listener._id);
    const users = await User.find({ _id: { $in: userIds } })
        .select("_id profile.dateOfBirth profile.country")
        .lean();
    const userMap = new Map(users.map((user) => [String(user._id), user]));

    return uniqueListeners.map((listener) => {
        const user = userMap.get(String(listener._id));

        return {
            userId: String(listener._id),
            country: String(user?.profile?.country || "").trim(),
            dateOfBirth: user?.profile?.dateOfBirth || null,
        };
    });
};

const sumStreamCount = (stats = []) =>
    stats.reduce((total, stat) => total + Number(stat?.streamCount || 0), 0);

export const getArtistPerformanceOverview = async ({
    userId,
    range,
    year,
}) => {
    const artist = await resolveArtistProfile(userId);
    const selectedRange = resolveRange(range);
    const selectedYear = resolveYear(year);
    const dailyPeriod = selectedRange === "all"
        ? await resolveAllTimePeriod(artist._id)
        : resolveRangePeriod(selectedRange);
    const monthlyPeriod = resolveMonthlyPeriod(selectedYear);
    const currentYear = getTodayInAnalyticsTimezone().year();
    const yearlyPeriod = resolveYearlyPeriod(currentYear);
    const allTimeSummaryPeriod = resolveAllTimeSummaryPeriod();
    const yearSeries = buildYearSeries(currentYear);

    const [
        dailyStats,
        monthlyStats,
        yearlyStats,
        availableYears,
        trackCount,
        totalStreams,
    ] = await Promise.all([
        aggregateDailyStats({
            artistId: artist._id,
            startDate: dailyPeriod.startDate,
            endDateExclusive: dailyPeriod.endDateExclusive,
        }),
        aggregateMonthlyStats({
            artistId: artist._id,
            startDate: monthlyPeriod.startDate,
            endDateExclusive: monthlyPeriod.endDateExclusive,
        }),
        aggregateYearlyStats({
            artistId: artist._id,
            startDate: yearlyPeriod.startDate,
            endDateExclusive: yearlyPeriod.endDateExclusive,
        }),
        aggregateAvailableYears({
            artistId: artist._id,
        }),
        Track.countDocuments({
            artist_artistId: artist._id,
        }),
        aggregatePeriodStreamCount({
            artistId: artist._id,
            startDate: allTimeSummaryPeriod.startDate,
            endDateExclusive: allTimeSummaryPeriod.endDateExclusive,
        }),
    ]);

    const filledDailyStats = fillMissingDailyStats({
        stats: dailyStats,
        from: dailyPeriod.from,
        to: dailyPeriod.to,
    });
    const filledMonthlyStats = fillMissingMonthlyStats({
        stats: monthlyStats,
        year: selectedYear,
    });
    const filledYearlyStats = fillMissingYearlyStats({
        stats: yearlyStats,
        years: yearSeries,
    });

    return {
        artist: {
            id: String(artist._id),
            name: artist.name || "Nghệ sĩ",
        },
        range: selectedRange,
        period: {
            from: dailyPeriod.fromDateKey,
            to: dailyPeriod.toDateKey,
        },
        selectedYear,
        availableYears,
        summary: {
            followers: Number(artist?.stats?.followers || 0),
            trackCount: Number(trackCount || 0),
            totalStreams: Number(totalStreams || 0),
        },
        dailyStats: filledDailyStats,
        monthlyStats: filledMonthlyStats,
        yearlyStats: filledYearlyStats,
    };
};

export default {
    getArtistPerformanceOverview,
};
