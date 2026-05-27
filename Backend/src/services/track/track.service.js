import mongoose from "mongoose";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import Track from "../../models/Track.js";
import TrackDailyStat from "../../models/TrackDailyStat.js";
import redisClient from "../../config/redisConfig.js";
import { AppError } from "../../utils/AppError.js";
import {
    formatTrackDetail,
    formatTrackPlayback,
    formatTrackItem,
    getPremiumAccessState,
    getValidAudioFiles,
} from "./track.helper.js";
import { getAnalyticsTimezone } from "../analytics/trackStatAggregation.service.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const TOP_TRACKS_TODAY_TTL_SECONDS = 5 * 60;
const TOP_TRACKS_PAST_TTL_SECONDS = 24 * 60 * 60;

const parseDailyTopTracksDate = (dateInput) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateInput);
    if (!match) {
        throw new AppError("Date is invalid.", 400, {
            field: "date",
        });
    }

    const [, yearStr, monthStr, dayStr] = match;
    const analyticsTimezone = getAnalyticsTimezone();
    const normalizedDateKey = `${yearStr}-${monthStr}-${dayStr}`;
    const startDay = dayjs
        .tz(`${normalizedDateKey}T00:00:00`, analyticsTimezone)
        .startOf("day");

    if (!startDay.isValid() || startDay.format("YYYY-MM-DD") !== normalizedDateKey) {
        throw new AppError("Date is invalid.", 400, {
            field: "date",
        });
    }

    const endDate = startDay.add(1, "day");

    return {
        startDate: startDay.toDate(),
        endDate: endDate.toDate(),
        dateKey: startDay.format("YYYY-MM-DD"),
    };
};

const buildDailyTopTracksCacheKey = ({ dateKey, limit }) =>
    `top_tracks:daily:${dateKey}:limit:${limit}`;

const getDailyTopTracksCacheTtl = (dateKey) => {
    const analyticsTimezone = getAnalyticsTimezone();
    const todayKey = dayjs().tz(analyticsTimezone).format("YYYY-MM-DD");

    return dateKey === todayKey
        ? TOP_TRACKS_TODAY_TTL_SECONDS
        : TOP_TRACKS_PAST_TTL_SECONDS;
};

const formatDailyTopTrackStat = (stat) => ({
    track: formatTrackItem(stat.trackId),
    date: stat.date,
    playCount: stat.playCount,
    uniqueListeners: stat.uniqueListeners,
    skipCount: stat.skipCount,
});

const getTrackDetail = async (trackId) => {
    if (!mongoose.Types.ObjectId.isValid(trackId)) {
        throw new AppError("Track id is invalid.", 400, {
            field: "id",
        });
    }

    const track = await Track.findOne({
        _id: trackId,
        activeStatus: "active",
        approvalStatus: "approved",
    })
        .populate({
            path: "artist_artistId",
            select: "name avatar coverImage",
        })
        .populate({
            path: "album_albumId",
            select: "title coverImage",
        })
        .populate({
            path: "genreIds",
            select: "name image",
        })
        .lean()
        .select("-__v -createdAt -updatedAt -blockedReason -hiddenReason -hiddenAt");

    if (!track) {
        throw new AppError("Track not found.", 404);
    }

    return formatTrackDetail(track);
};

const getTrackPlayback = async (trackId, user) => {
    if (!mongoose.Types.ObjectId.isValid(trackId)) {
        throw new AppError("Track id is invalid.", 400, {
            field: "id",
        });
    }

    const track = await Track.findOne({
        _id: trackId,
        activeStatus: "active",
        approvalStatus: "approved",
    })
        .populate({
            path: "artist_artistId",
            select: "name avatar coverImage",
        })
        .populate({
            path: "album_albumId",
            select: "title coverImage",
        })
        .lean()
        .select("-__v -createdAt -updatedAt");

    if (!track) {
        throw new AppError("Track not found.", 404);
    }

    const validAudioFiles = getValidAudioFiles(track.audioFiles);
    if (!validAudioFiles.length) {
        throw new AppError("Track does not have any audio file.", 404);
    }

    const accessState = await getPremiumAccessState(user);

    return formatTrackPlayback(track, validAudioFiles, accessState);
};

const getDailyTopTracks = async ({ date, limit }) => {
    const { startDate, endDate, dateKey } = parseDailyTopTracksDate(date);
    const cacheKey = buildDailyTopTracksCacheKey({ dateKey, limit });

    if (redisClient.isOpen) {
        try {
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                return {
                    topTracks: JSON.parse(cachedData),
                    meta: {
                        date: dateKey,
                        limit,
                        cacheKey,
                        cacheHit: true,
                    },
                };
            }
        } catch (error) {
            console.error("Failed to read daily top tracks from Redis:", error);
        }
    }

    const stats = await TrackDailyStat.find({
        date: {
            $gte: startDate,
            $lt: endDate,
        },
    })
        .sort({ playCount: -1, uniqueListeners: -1, trackId: 1 })
        .limit(limit)
        .populate({
            path: "trackId",
            select: "_id title duration avatar stats activeStatus approvalStatus artist_artistId",
            populate: {
                path: "artist_artistId",
                select: "_id name avatar",
            },
        })
        .lean();

    const topTracks = stats.map(formatDailyTopTrackStat);

    if (redisClient.isOpen) {
        try {
            const ttl = getDailyTopTracksCacheTtl(dateKey);
            await redisClient.setEx(cacheKey, ttl, JSON.stringify(topTracks));
        } catch (error) {
            console.error("Failed to cache daily top tracks in Redis:", error);
        }
    }

    return {
        topTracks,
        meta: {
            date: dateKey,
            limit,
            cacheKey,
            cacheHit: false,
        },
    };
};

export default {
    getTrackDetail,
    getTrackPlayback,
    getDailyTopTracks,
};
