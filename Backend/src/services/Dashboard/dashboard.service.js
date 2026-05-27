import ListenEvent from "../../models/ListenEvent.js";
import Track from "../../models/Track.js";
import Artist from "../../models/Artist.js";
import User from "../../models/User.js";
import PlatformMonthlyStat from "../../models/PlatformMonthlyStat.js";

const formatDate = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const computeDailyStats = async (date) => {
    const targetDate = new Date(date);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const results = await ListenEvent.aggregate([
        {
            $match: {
                listenedAt: { $gte: startOfDay, $lte: endOfDay },
            },
        },
        {
            $facet: {
                overview: [
                    {
                        $group: {
                            _id: null,
                            totalStreams: { $sum: 1 },
                            uniqueUsers: { $addToSet: "$userId" },
                            totalListeningTime: { $sum: "$duration" },
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            totalStreams: 1,
                            uniqueUsers: { $size: "$uniqueUsers" },
                            totalListeningTime: 1,
                        },
                    },
                ],
                topTracks: [
                    { $match: { trackId: { $ne: null } } },
                    {
                        $group: {
                            _id: "$trackId",
                            streamCount: { $sum: 1 },
                        },
                    },
                    { $sort: { streamCount: -1 } },
                    { $limit: 10 },
                    {
                        $lookup: {
                            from: "tracks",
                            localField: "_id",
                            foreignField: "_id",
                            as: "track",
                        },
                    },
                    { $unwind: { path: "$track", preserveNullAndEmptyArrays: true } },
                    {
                        $project: {
                            trackId: "$_id",
                            title: { $ifNull: ["$track.title", "Unknown"] },
                            streamCount: 1,
                        },
                    },
                ],
                topArtists: [
                    { $match: { artistId: { $ne: null } } },
                    {
                        $group: {
                            _id: "$artistId",
                            streamCount: { $sum: 1 },
                        },
                    },
                    { $sort: { streamCount: -1 } },
                    { $limit: 10 },
                ],
            },
        },
    ]);

    const overview = results[0]?.overview[0] || {
        totalStreams: 0,
        uniqueUsers: 0,
        totalListeningTime: 0,
    };
    const topTracks = results[0]?.topTracks || [];
    const topArtists = results[0]?.topArtists || [];

    const trackIds = topTracks.map((t) => t.trackId).filter(Boolean);
    const artistIds = topArtists.map((a) => a._id).filter(Boolean);

    const [tracksData, artistsData] = await Promise.all([
        trackIds.length ? Track.find({ _id: { $in: trackIds } }).select("_id title").lean() : [],
        artistIds.length ? Artist.find({ _id: { $in: artistIds } }).select("_id name").lean() : [],
    ]);

    const trackMap = Object.fromEntries(tracksData.map((t) => [t._id.toString(), t.title]));
    const artistMap = Object.fromEntries(artistsData.map((a) => [a._id.toString(), a.name]));

    const enrichedTopTracks = topTracks.map((t) => ({
        trackId: t.trackId,
        title: trackMap[t.trackId?.toString()] || t.title || "Unknown",
        streamCount: t.streamCount,
    }));

    const enrichedTopArtists = topArtists.map((a) => ({
        artistId: a._id,
        streamCount: a.streamCount,
    }));

    const dailyData = {
        date: formatDate(targetDate),
        totalStreams: overview.totalStreams,
        uniqueUsers: overview.uniqueUsers,
        totalListeningTime: overview.totalListeningTime,
        topTracks: enrichedTopTracks,
        topArtists: enrichedTopArtists,
    };

    await PlatformMonthlyStat.findOneAndUpdate(
        { year, month },
        {
            year,
            month,
            periodStart: new Date(year, month - 1, 1),
            periodEnd: new Date(year, month, 0, 23, 59, 59, 999),
            $set: { [`dailyStats`]: { $elemMatch: { date: formatDate(targetDate) } } },
        },
        { upsert: true, new: true }
    );

    await PlatformMonthlyStat.findOneAndUpdate(
        { year, month },
        {
            $set: { [`dailyStats.$[elem]`]: dailyData },
        },
        {
            arrayFilters: [{ elem: { date: formatDate(targetDate) } }],
            new: true },
    ).then(async (doc) => {
        if (!doc) {
            await PlatformMonthlyStat.findOneAndUpdate(
                { year, month },
                { $push: { dailyStats: { $each: [dailyData], $position: 0 } } },
                { upsert: true, new: true }
            );
        }
    });

    const [totalUsers, totalArtists] = await Promise.all([
        User.countDocuments({ role: { $in: ["user", "artist"] } }),
        Artist.countDocuments({}),
    ]);

    await PlatformMonthlyStat.findOneAndUpdate(
        { year, month },
        {
            userStats: { newUsers: 0, totalUsers },
            artistStats: { totalArtists },
            $inc: {
                "streamingStats.totalStreams": overview.totalStreams,
                "streamingStats.trackStreams": overview.totalStreams,
                "streamingStats.totalListeningTime": overview.totalListeningTime,
            },
        },
        { upsert: true, new: true }
    );

    return dailyData;
};

const aggregateOverviewStats = async (days = 7) => {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    const lookback = new Date();
    lookback.setDate(lookback.getDate() - 30);
    lookback.setHours(0, 0, 0, 0);

    const recentYearsMonths = new Set();
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        recentYearsMonths.add(`${d.getFullYear()}-${d.getMonth() + 1}`);
    }
    const recentFilter = Array.from(recentYearsMonths).map((ym) => {
        const [y, m] = ym.split("-");
        return { year: parseInt(y), month: parseInt(m) };
    });

    const olderLookback = new Date(lookback);
    olderLookback.setDate(olderLookback.getDate() - days);
    const olderYearsMonths = new Set();
    for (let d = new Date(olderLookback); d < startDate; d.setDate(d.getDate() + 1)) {
        olderYearsMonths.add(`${d.getFullYear()}-${d.getMonth() + 1}`);
    }
    const olderFilter = Array.from(olderYearsMonths).map((ym) => {
        const [y, m] = ym.split("-");
        return { year: parseInt(y), month: parseInt(m) };
    });

    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);
    const olderStartStr = formatDate(olderLookback);
    const olderEndStr = formatDate(new Date(startDate.getTime() - 1));

    const [recentDocs, olderDocs, totalUsers, totalTracks, totalArtists] = await Promise.all([
        recentFilter.length ? PlatformMonthlyStat.find({ $or: recentFilter }).lean() : [],
        olderFilter.length ? PlatformMonthlyStat.find({ $or: olderFilter }).lean() : [],
        User.countDocuments({ role: { $in: ["user", "artist"] } }),
        Track.countDocuments({ activeStatus: "active" }),
        Artist.countDocuments({}),
    ]);

    let recent = { totalStreams: 0, totalUniqueUsers: 0, totalListeningTime: 0, dailyCount: 0, dailySum: 0 };
    for (const doc of recentDocs) {
        const daysInRange = doc.dailyStats?.filter(
            (d) => d.date >= startStr && d.date <= endStr
        ) || [];
        for (const day of daysInRange) {
            recent.totalStreams += day.totalStreams || 0;
            recent.totalListeningTime += day.totalListeningTime || 0;
        }
        recent.dailyCount += daysInRange.length;
        recent.dailySum += doc.dailyStats?.length || 0;
    }

    let older = { totalStreams: 0, totalUniqueUsers: 0 };
    for (const doc of olderDocs) {
        const daysInRange = doc.dailyStats?.filter(
            (d) => d.date >= olderStartStr && d.date <= olderEndStr
        ) || [];
        for (const day of daysInRange) {
            older.totalStreams += day.totalStreams || 0;
        }
    }

    const streamsChange = older.totalStreams > 0
        ? ((recent.totalStreams - older.totalStreams) / older.totalStreams) * 100
        : recent.totalStreams > 0 ? 100 : 0;

    const todayStr = formatDate(new Date());
    let todayStreams = 0;
    for (const doc of recentDocs) {
        const todayEntry = doc.dailyStats?.find((d) => d.date === todayStr);
        if (todayEntry) {
            todayStreams = todayEntry.totalStreams || 0;
            break;
        }
    }

    return {
        summary: {
            totalStreams: recent.totalStreams,
            avgDailyStreams: recent.dailyCount > 0 ? Math.round(recent.totalStreams / recent.dailyCount) : 0,
            totalUniqueUsers: recent.totalUniqueUsers,
            totalListeningTime: recent.totalListeningTime,
            streamsChange: Math.round(streamsChange * 10) / 10,
            activeUsersChange: 0,
            totalUsers,
            totalTracks,
            totalArtists,
            todayStreams,
            todayUniqueUsers: 0,
        },
        period: { startDate: startStr, endDate: endStr, days },
    };
};

const getDailyStats = async (days = 7) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);

    const yearsMonths = new Set();
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        yearsMonths.add(`${d.getFullYear()}-${d.getMonth() + 1}`);
    }
    const filter = Array.from(yearsMonths).map((ym) => {
        const [y, m] = ym.split("-");
        return { year: parseInt(y), month: parseInt(m) };
    });

    const docs = filter.length ? await PlatformMonthlyStat.find({ $or: filter }).lean() : [];

    const allDaily = [];
    for (const doc of docs) {
        for (const day of doc.dailyStats || []) {
            if (day.date >= startStr && day.date <= endStr) {
                allDaily.push(day);
            }
        }
    }

    return allDaily.sort((a, b) => a.date.localeCompare(b.date));
};

const getTopTracksAllTime = async (limit = 10) => {
    const docs = await PlatformMonthlyStat.find({})
        .sort({ year: -1, month: -1 })
        .limit(6)
        .lean();

    const trackMap = {};
    for (const doc of docs) {
        for (const day of doc.dailyStats || []) {
            for (const track of day.topTracks || []) {
                const key = track.trackId?.toString();
                if (key) {
                    if (!trackMap[key]) {
                        trackMap[key] = { trackId: track.trackId, title: track.title, streamCount: 0 };
                    }
                    trackMap[key].streamCount += track.streamCount;
                }
            }
        }
    }

    return Object.values(trackMap)
        .sort((a, b) => b.streamCount - a.streamCount)
        .slice(0, limit);
};

const getTopArtistsAllTime = async (limit = 10) => {
    const docs = await PlatformMonthlyStat.find({})
        .sort({ year: -1, month: -1 })
        .limit(6)
        .lean();

    const artistMap = {};
    for (const doc of docs) {
        for (const day of doc.dailyStats || []) {
            for (const artist of day.topArtists || []) {
                const key = artist.artistId?.toString();
                if (key) {
                    if (!artistMap[key]) {
                        artistMap[key] = { artistId: artist.artistId, streamCount: 0 };
                    }
                    artistMap[key].streamCount += artist.streamCount;
                }
            }
        }
    }

    const artistIds = Object.values(artistMap).map((a) => a.artistId).filter(Boolean);
    const artists = artistIds.length
        ? await Artist.find({ _id: { $in: artistIds } }).select("_id name").lean()
        : [];
    const artistNameMap = Object.fromEntries(artists.map((a) => [a._id.toString(), a.name]));

    return Object.values(artistMap)
        .map((a) => ({
            artistId: a.artistId,
            name: artistNameMap[a.artistId?.toString()] || "Unknown",
            streamCount: a.streamCount,
        }))
        .sort((a, b) => b.streamCount - a.streamCount)
        .slice(0, limit);
};

const getMonthlyStats = async (year, month) => {
    const stat = await PlatformMonthlyStat.findOne({ year, month }).lean();
    return stat;
};

const getRecentMonthsStats = async (months = 6) => {
    const result = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const stat = await PlatformMonthlyStat.findOne({ year: y, month: m }).lean();
        result.push(stat || {
            year: y, month: m,
            streamingStats: { totalStreams: 0, trackStreams: 0, totalListeningTime: 0 },
            userStats: { newUsers: 0, totalUsers: 0 },
            dailyStats: [],
        });
    }

    return result.reverse();
};

export default {
    computeDailyStats,
    aggregateOverviewStats,
    getDailyStats,
    getTopTracksAllTime,
    getTopArtistsAllTime,
    getMonthlyStats,
    getRecentMonthsStats,
};
