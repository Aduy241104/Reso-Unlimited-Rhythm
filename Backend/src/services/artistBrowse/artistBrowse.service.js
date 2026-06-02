import mongoose from "mongoose";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import Album from "../../models/Album.js";
import Artist from "../../models/Artist.js";
import ArtistDailyRanking from "../../models/ArtistDailyRanking.js";
import ArtistMonthlyRanking from "../../models/ArtistMonthlyRanking.js";
import Interaction from "../../models/Interaction.js";
import ReleaseSchedule from "../../models/ReleaseSchedule.js";
import ArtistStat from "../../models/ArtistStat.js";
import Track from "../../models/Track.js";
import redisClient from "../../config/redisConfig.js";
import { AppError } from "../../utils/AppError.js";
import { getAnalyticsTimezone } from "../analytics/trackStatAggregation.service.js";
import {
    formatArtistAlbum,
    formatArtistComingRelease,
    formatArtistFollowState,
    formatArtistProfile,
    formatArtistTrack,
    normalizePositiveInteger,
} from "./artistBrowse.helper.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const TOP_ARTISTS_TODAY_TTL_SECONDS = 5 * 60;
const TOP_ARTISTS_PAST_TTL_SECONDS = 24 * 60 * 60;
const TOP_ARTISTS_CURRENT_MONTH_TTL_SECONDS = 15 * 60;
const TOP_ARTISTS_PAST_MONTH_TTL_SECONDS = 24 * 60 * 60;

const buildDailyTopArtistsCacheKey = ({ dateKey, limit }) =>
    `top_artists:daily:${dateKey}:limit:${limit}`;

const buildMonthlyTopArtistsCacheKey = ({ monthKey, limit }) =>
    `top_artists:monthly:${monthKey}:limit:${limit}`;

const getDailyTopArtistsCacheTtl = (dateKey) => {
    const analyticsTimezone = getAnalyticsTimezone();
    const todayKey = dayjs().tz(analyticsTimezone).format("YYYY-MM-DD");

    return dateKey === todayKey
        ? TOP_ARTISTS_TODAY_TTL_SECONDS
        : TOP_ARTISTS_PAST_TTL_SECONDS;
};

const getMonthlyTopArtistsCacheTtl = (monthKey) => {
    const analyticsTimezone = getAnalyticsTimezone();
    const currentMonthKey = dayjs().tz(analyticsTimezone).format("YYYY-MM");

    return monthKey === currentMonthKey
        ? TOP_ARTISTS_CURRENT_MONTH_TTL_SECONDS
        : TOP_ARTISTS_PAST_MONTH_TTL_SECONDS;
};

const getValidArtistIds = async (artistIds) => {
    if (artistIds.length === 0) {
        return new Set();
    }

    const validArtists = await Artist.find({
        _id: { $in: artistIds },
        activeStatus: "active",
    })
        .select("_id")
        .lean();

    return new Set(validArtists.map((artist) => artist._id.toString()));
};

const normalizeTopArtists = async (topArtists, limit) => {
    const normalizedArtists = Array.isArray(topArtists) ? topArtists : [];
    const artistIds = normalizedArtists
        .map((item) => item?.artist?.id)
        .filter(Boolean);
    const validArtistIds = await getValidArtistIds(artistIds);

    return normalizedArtists
        .filter((item) => item?.artist?.id && validArtistIds.has(String(item.artist.id)))
        .slice(0, limit)
        .map((item, index) => ({
            ...item,
            rank: index + 1,
        }));
};

const validateAndGetArtist = async (artistId, options = {}) => {
    const { lean = true } = options;

    if (!mongoose.Types.ObjectId.isValid(artistId)) {
        throw new AppError("Artist id is invalid.", 400, {
            field: "id",
        });
    }

    let query = Artist.findOne({
        _id: artistId,
        activeStatus: "active",
    });

    if (lean) {
        query = query.lean();
    }

    const artist = await query;

    if (!artist) {
        throw new AppError("Artist not found.", 404);
    }

    return artist;
};

const parseDailyTopArtistsDate = (dateInput) => {
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

    return {
        startDate: startDay.toDate(),
        endDate: startDay.add(1, "day").toDate(),
        dateKey: startDay.format("YYYY-MM-DD"),
    };
};

const buildDailyDateQuery = ({ dateKey, startDate, endDate }) => ({
    $or: [
        { dateKey },
        {
            date: {
                $gte: startDate,
                $lt: endDate,
            },
        },
    ],
});

const parseMonthlyTopArtistsMonth = (monthInput) => {
    const match = /^(\d{4})-(\d{2})$/.exec(monthInput);
    if (!match) {
        throw new AppError("Month is invalid.", 400, {
            field: "month",
        });
    }

    const [, yearStr, monthStr] = match;
    const analyticsTimezone = getAnalyticsTimezone();
    const normalizedMonthKey = `${yearStr}-${monthStr}`;
    const startMonth = dayjs
        .tz(`${normalizedMonthKey}-01T00:00:00`, analyticsTimezone)
        .startOf("month");

    if (!startMonth.isValid() || startMonth.format("YYYY-MM") !== normalizedMonthKey) {
        throw new AppError("Month is invalid.", 400, {
            field: "month",
        });
    }

    return {
        year: startMonth.year(),
        month: startMonth.month() + 1,
        monthKey: startMonth.format("YYYY-MM"),
    };
};

const formatDailyTopArtistStat = ({ stat, date }) => ({
    artist: stat.artistId
        ? {
            id: stat.artistId._id.toString(),
            name: stat.artistId.name,
            avatar: stat.artistId.avatar,
        }
        : null,
    rank: stat.rank,
    date,
    score: stat.score,
    uniqueListeners: stat.uniqueListeners,
    playCount: stat.playCount,
    completedPlayCount: stat.completedPlayCount,
});

const buildArtistFollowFilter = (userId, artistId) => ({
    userId,
    targetType: "Artist",
    targetId: artistId,
    action: "follow",
});

const getArtistProfile = async (artistId) => {
    const artist = await validateAndGetArtist(artistId);

    const [artistStat, albums, tracks] = await Promise.all([
        ArtistStat.findOne({
            artistId,
        }).lean(),
        Album.find({
            artistId,
            status: "active",
        })
            .sort({ releaseDate: -1, totalPlays: -1, createdAt: -1, _id: -1 })
            .lean(),
        Track.find({
            artist_artistId: artistId,
            activeStatus: "active",
            approvalStatus: "approved",
        })
            .sort({ releaseDate: -1, "stats.totalPlay": -1, createdAt: -1, _id: -1 })
            .populate({
                path: "album_albumId",
                select: "title coverImage releaseDate",
                match: { status: "active" },
            })
            .lean(),
    ]);

    return formatArtistProfile({
        artist,
        artistStat,
        albums,
        tracks,
    });
};

const getArtistTracks = async (artistId, query = {}) => {
    await validateAndGetArtist(artistId);

    const page = normalizePositiveInteger(query.page, DEFAULT_PAGE);
    const requestedLimit = normalizePositiveInteger(query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;

    const filter = {
        artist_artistId: artistId,
        activeStatus: "active",
        approvalStatus: "approved",
    };

    const [tracks, total] = await Promise.all([
        Track.find(filter)
            .sort({ releaseDate: -1, "stats.totalPlay": -1, createdAt: -1, _id: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
                path: "album_albumId",
                select: "title coverImage releaseDate",
                match: { status: "active" },
            })
            .lean(),
        Track.countDocuments(filter),
    ]);

    return {
        tracks: tracks.map(formatArtistTrack),
        pagination: {
            page,
            limit,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
    };
};

const getArtistAlbums = async (artistId, query = {}) => {
    await validateAndGetArtist(artistId);

    const page = normalizePositiveInteger(query.page, DEFAULT_PAGE);
    const requestedLimit = normalizePositiveInteger(query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;

    const filter = {
        artistId,
        status: "active",
    };

    const [albums, total] = await Promise.all([
        Album.find(filter)
            .sort({ releaseDate: -1, totalPlays: -1, createdAt: -1, _id: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Album.countDocuments(filter),
    ]);

    return {
        albums: albums.map(formatArtistAlbum),
        pagination: {
            page,
            limit,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
    };
};

const getArtistComingReleases = async (artistId, query = {}) => {
    await validateAndGetArtist(artistId);

    const page = normalizePositiveInteger(query.page, DEFAULT_PAGE);
    const requestedLimit = normalizePositiveInteger(query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;
    const now = new Date();

    const filter = {
        artistId,
        status: "scheduled",
        scheduledAt: { $gte: now },
    };

    const [schedules, total] = await Promise.all([
        ReleaseSchedule.find(filter)
            .sort({ scheduledAt: 1, createdAt: 1, _id: 1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        ReleaseSchedule.countDocuments(filter),
    ]);

    const albumIds = schedules
        .filter((schedule) => schedule.type === "album")
        .map((schedule) => schedule.targetId);
    const trackIds = schedules
        .filter((schedule) => schedule.type === "track")
        .map((schedule) => schedule.targetId);

    const [albums, tracks] = await Promise.all([
        albumIds.length > 0
            ? Album.find({
                _id: { $in: albumIds },
                artistId,
            }).lean()
            : [],
        trackIds.length > 0
            ? Track.find({
                _id: { $in: trackIds },
                artist_artistId: artistId,
            }).lean()
            : [],
    ]);

    const albumMap = new Map(albums.map((album) => [album._id.toString(), album]));
    const trackMap = new Map(tracks.map((track) => [track._id.toString(), track]));

    return {
        comingReleases: schedules
            .map((schedule) => {
                const target =
                    schedule.type === "album"
                        ? albumMap.get(schedule.targetId.toString())
                        : trackMap.get(schedule.targetId.toString());

                if (!target) {
                    return null;
                }

                return formatArtistComingRelease({ schedule, target });
            })
            .filter(Boolean),
        pagination: {
            page,
            limit,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
    };
};

const getDailyTopArtists = async (query = {}) => {
    const { startDate, endDate, dateKey } = parseDailyTopArtistsDate(query.date);
    const requestedLimit = normalizePositiveInteger(query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, 20);
    const cacheKey = buildDailyTopArtistsCacheKey({ dateKey, limit });

    if (redisClient.isOpen) {
        try {
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                const parsedTopArtists = JSON.parse(cachedData);
                const topArtists = await normalizeTopArtists(parsedTopArtists, limit);

                if (topArtists.length === limit || parsedTopArtists.length < limit) {
                    return {
                        topArtists,
                        meta: {
                            date: dateKey,
                            limit,
                            cacheKey,
                            cacheHit: true,
                        },
                    };
                }
            }
        } catch (error) {
            console.error("Failed to read daily top artists from Redis:", error);
        }
    }

    const rankingDocument = await ArtistDailyRanking.findOne(
        buildDailyDateQuery({ dateKey, startDate, endDate })
    )
        .populate({
            path: "rankings.artistId",
            select: "_id name avatar activeStatus",
            match: { activeStatus: "active" },
        })
        .lean();

    const rankings = Array.isArray(rankingDocument?.rankings)
        ? rankingDocument.rankings
        : [];

    const topArtists = rankings
        .filter((stat) => Boolean(stat.artistId))
        .map((stat) =>
            formatDailyTopArtistStat({
                stat,
                date: rankingDocument?.dateKey || dateKey,
            })
        );
    const normalizedTopArtists = await normalizeTopArtists(topArtists, limit);

    if (redisClient.isOpen) {
        try {
            const ttl = getDailyTopArtistsCacheTtl(dateKey);
            await redisClient.setEx(cacheKey, ttl, JSON.stringify(normalizedTopArtists));
        } catch (error) {
            console.error("Failed to cache daily top artists in Redis:", error);
        }
    }

    return {
        topArtists: normalizedTopArtists,
        meta: {
            date: dateKey,
            limit,
            cacheKey,
            cacheHit: false,
        },
    };
};

const getMonthlyTopArtists = async (query = {}) => {
    const { year, month, monthKey } = parseMonthlyTopArtistsMonth(query.month);
    const requestedLimit = normalizePositiveInteger(query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, 20);
    const cacheKey = buildMonthlyTopArtistsCacheKey({ monthKey, limit });

    if (redisClient.isOpen) {
        try {
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                const parsedTopArtists = JSON.parse(cachedData);
                const topArtists = await normalizeTopArtists(parsedTopArtists, limit);

                if (topArtists.length === limit || parsedTopArtists.length < limit) {
                    return {
                        topArtists,
                        meta: {
                            month: monthKey,
                            limit,
                            cacheKey,
                            cacheHit: true,
                        },
                    };
                }
            }
        } catch (error) {
            console.error("Failed to read monthly top artists from Redis:", error);
        }
    }

    const rankingDocument = await ArtistMonthlyRanking.findOne({ year, month })
        .populate({
            path: "rankings.artistId",
            select: "_id name avatar activeStatus",
            match: { activeStatus: "active" },
        })
        .lean();

    const rankings = Array.isArray(rankingDocument?.rankings)
        ? rankingDocument.rankings
        : [];

    const topArtists = rankings
        .filter((stat) => Boolean(stat.artistId))
        .map((stat) => ({
            artist: {
                id: stat.artistId._id.toString(),
                name: stat.artistId.name,
                avatar: stat.artistId.avatar,
            },
            rank: stat.rank,
            month: monthKey,
            score: stat.score,
            uniqueListeners: stat.uniqueListeners,
            playCount: stat.playCount,
            completedPlayCount: stat.completedPlayCount,
        }));
    const normalizedTopArtists = await normalizeTopArtists(topArtists, limit);

    if (redisClient.isOpen) {
        try {
            const ttl = getMonthlyTopArtistsCacheTtl(monthKey);
            await redisClient.setEx(cacheKey, ttl, JSON.stringify(normalizedTopArtists));
        } catch (error) {
            console.error("Failed to cache monthly top artists in Redis:", error);
        }
    }

    return {
        topArtists: normalizedTopArtists,
        meta: {
            month: monthKey,
            limit,
            cacheKey,
            cacheHit: false,
        },
    };
};

const followArtist = async (artistId, userId) => {
    const artist = await validateAndGetArtist(artistId, { lean: false });
    const followFilter = buildArtistFollowFilter(userId, artist._id);

    const existingFollow = await Interaction.findOne(followFilter).lean();

    if (existingFollow) {
        throw new AppError("You have already followed this artist.", 409);
    }

    await Interaction.create(followFilter);

    const nextFollowers = (artist.stats?.followers || 0) + 1;
    artist.set("stats.followers", nextFollowers);
    await artist.save();

    return formatArtistFollowState({
        artistId: artist._id,
        isFollowing: true,
        followers: nextFollowers,
    });
};

const unfollowArtist = async (artistId, userId) => {
    const artist = await validateAndGetArtist(artistId, { lean: false });
    const followFilter = buildArtistFollowFilter(userId, artist._id);

    const existingFollow = await Interaction.findOne(followFilter).lean();

    if (!existingFollow) {
        throw new AppError("You have not followed this artist yet.", 404);
    }

    await Interaction.deleteOne({ _id: existingFollow._id });

    const nextFollowers = Math.max((artist.stats?.followers || 0) - 1, 0);
    artist.set("stats.followers", nextFollowers);
    await artist.save();

    return formatArtistFollowState({
        artistId: artist._id,
        isFollowing: false,
        followers: nextFollowers,
    });
};

const toggleFollowArtist = async (artistId, userId) => {
    const artist = await validateAndGetArtist(artistId, { lean: false });
    const followFilter = buildArtistFollowFilter(userId, artist._id);

    const existingFollow = await Interaction.findOne(followFilter).lean();

    if (existingFollow) {
        await Interaction.deleteOne({ _id: existingFollow._id });

        const nextFollowers = Math.max((artist.stats?.followers || 0) - 1, 0);
        artist.set("stats.followers", nextFollowers);
        await artist.save();

        return {
            action: "unfollowed",
            follow: formatArtistFollowState({
                artistId: artist._id,
                isFollowing: false,
                followers: nextFollowers,
            }),
        };
    }

    await Interaction.create(followFilter);

    const nextFollowers = (artist.stats?.followers || 0) + 1;
    artist.set("stats.followers", nextFollowers);
    await artist.save();

    return {
        action: "followed",
        follow: formatArtistFollowState({
            artistId: artist._id,
            isFollowing: true,
            followers: nextFollowers,
        }),
    };
};

export default {
    getDailyTopArtists,
    getMonthlyTopArtists,
    getArtistProfile,
    getArtistAlbums,
    getArtistComingReleases,
    getArtistTracks,
    followArtist,
    unfollowArtist,
    toggleFollowArtist,
};
