import mongoose from "mongoose";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import RecentListeningActivity from "../../models/user.recentListening.model.js";
import UserListeningDailyStat from "../../models/UserListeningDailyStat.js";
import { getAnalyticsTimezone } from "../analytics/trackStatAggregation.service.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const RECENT_ACTIVITY_CHART_DAYS = 7;
const RECENT_ACTIVITY_LIST_LIMIT = 10;

const normalizeId = (value) => {
    if (!value) {
        return "";
    }

    if (typeof value === "object") {
        if (value._id) {
            return String(value._id);
        }

        if (value.id) {
            return String(value.id);
        }
    }

    return String(value);
};

const sanitizeText = (value, fallback = "") =>
    typeof value === "string" && value.trim() ? value.trim() : fallback;

const resolveTrackImage = (track = {}) => {
    if (typeof track?.avatar === "string" && track.avatar.trim()) {
        return track.avatar.trim();
    }

    if (Array.isArray(track?.coverImage)) {
        const firstImage = track.coverImage.find(
            (image) => typeof image === "string" && image.trim()
        );

        if (firstImage) {
            return firstImage.trim();
        }
    }

    if (typeof track?.coverImage === "string" && track.coverImage.trim()) {
        return track.coverImage.trim();
    }

    return "";
};

const resolveMinutes = (seconds) =>
    Number(((Number(seconds) || 0) / 60).toFixed(1));

const buildChartPoint = (day, stat = null) => ({
    date: day.format("YYYY-MM-DD"),
    label: day.format("DD/MM"),
    listenCount: Number(stat?.listenCount || 0),
    listenedMinutes: resolveMinutes(stat?.totalListenedDuration || 0),
});

export const storeRecentListeningActivity = async ({
    userId,
    track,
    artistId,
    albumId,
    listenedAt,
    listenedDuration,
    listenPercent,
    source,
}) => {
    const artist = track?.artist_artistId || null;
    const album = track?.album_albumId || null;

    return RecentListeningActivity.create({
        userId,
        trackId: normalizeId(track?._id || track?.id),
        artistId: normalizeId(artistId || artist?._id || artist?.id) || null,
        albumId: normalizeId(albumId || album?._id || album?.id) || null,
        trackTitle: sanitizeText(track?.title, "Untitled track"),
        trackImage: resolveTrackImage(track),
        artistName: sanitizeText(artist?.name, "Unknown artist"),
        artistAvatar: sanitizeText(artist?.avatar),
        albumTitle: sanitizeText(album?.title),
        albumCoverImage: sanitizeText(album?.coverImage),
        trackDuration: Number(track?.duration) || 0,
        listenedDuration: Number(listenedDuration) || 0,
        listenPercent: Number.isFinite(Number(listenPercent))
            ? Number(listenPercent)
            : null,
        listenedAt: listenedAt || new Date(),
        source: sanitizeText(source, "unknown"),
    });
};

export const getRecentListeningActivityByUserId = async (userId) => {
    const analyticsTimezone = getAnalyticsTimezone();
    const today = dayjs().tz(analyticsTimezone).startOf("day");
    const startDay = today.subtract(RECENT_ACTIVITY_CHART_DAYS - 1, "day");
    const endDay = today.add(1, "day");
    const normalizedUserId = new mongoose.Types.ObjectId(String(userId));
    const previousDaysEnd = today.toDate();

    const [storedDailyStats, rawDailyStats, recentItems] = await Promise.all([
        UserListeningDailyStat.find({
            userId: normalizedUserId,
            date: {
                $gte: startDay.toDate(),
                $lt: previousDaysEnd,
            },
        })
            .sort({ date: 1 })
            .lean(),
        RecentListeningActivity.aggregate([
            {
                $match: {
                    userId: normalizedUserId,
                    listenedAt: {
                        $gte: startDay.toDate(),
                        $lt: endDay.toDate(),
                    },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$listenedAt",
                            timezone: analyticsTimezone,
                        },
                    },
                    listenCount: { $sum: 1 },
                    totalListenedDuration: {
                        $sum: { $ifNull: ["$listenedDuration", 0] },
                    },
                },
            },
            { $sort: { _id: 1 } },
        ]),
        RecentListeningActivity.find({ userId: normalizedUserId })
            .sort({ listenedAt: -1 })
            .limit(RECENT_ACTIVITY_LIST_LIMIT)
            .lean(),
    ]);

    const storedStatByDate = new Map(
        storedDailyStats.map((stat) => [stat.dateKey, stat])
    );
    const rawStatByDate = new Map(
        rawDailyStats.map((stat) => [stat._id, stat])
    );

    const chart = Array.from({ length: RECENT_ACTIVITY_CHART_DAYS }, (_, index) => {
        const day = startDay.add(index, "day");
        const dateKey = day.format("YYYY-MM-DD");
        const resolvedStat = day.isSame(today, "day")
            ? rawStatByDate.get(dateKey)
            : storedStatByDate.get(dateKey) || rawStatByDate.get(dateKey);

        return buildChartPoint(day, resolvedStat);
    });

    const totalListens = chart.reduce(
        (sum, item) => sum + Number(item.listenCount || 0),
        0
    );
    const totalMinutes = Number(
        chart
            .reduce((sum, item) => sum + Number(item.listenedMinutes || 0), 0)
            .toFixed(1)
    );
    const activeDays = chart.filter((item) => item.listenCount > 0).length;

    return {
        timezone: analyticsTimezone,
        range: {
            days: RECENT_ACTIVITY_CHART_DAYS,
            from: startDay.format("YYYY-MM-DD"),
            to: today.format("YYYY-MM-DD"),
        },
        summary: {
            totalListens,
            totalMinutes,
            activeDays,
            latestTrackTitle: sanitizeText(
                recentItems[0]?.trackTitle,
                "No recent track"
            ),
        },
        chart,
        recentTracks: recentItems.map((item) => ({
            id: normalizeId(item?._id),
            listenedAt: item?.listenedAt || null,
            listenedDuration: Number(item?.listenedDuration || 0),
            listenedMinutes: resolveMinutes(item?.listenedDuration || 0),
            source: sanitizeText(item?.source, "unknown"),
            track: {
                id: normalizeId(item?.trackId),
                title: sanitizeText(item?.trackTitle, "Untitled track"),
                image: sanitizeText(item?.trackImage),
                duration: Number(item?.trackDuration || 0),
            },
            artist: {
                id: normalizeId(item?.artistId),
                name: sanitizeText(item?.artistName, "Unknown artist"),
                avatar: sanitizeText(item?.artistAvatar),
            },
            album: {
                id: normalizeId(item?.albumId),
                title: sanitizeText(item?.albumTitle),
                coverImage: sanitizeText(item?.albumCoverImage),
            },
        })),
    };
};

export default {
    getRecentListeningActivityByUserId,
    storeRecentListeningActivity,
};
