import Artist from "../../models/Artist.js";

export const ARTIST_TOP_RANKINGS_LIMIT = 20;

export const buildArtistAggregationPipeline = ({ startDate, endDate }) => ([
    {
        $match: {
            artistId: { $exists: true, $ne: null },
            isValidStream: true,
            listenedAt: { $gte: startDate, $lt: endDate },
        },
    },
    {
        $group: {
            _id: "$artistId",
            playCount: { $sum: 1 },
            uniqueListeners: { $addToSet: "$userId" },
            totalTracksPlayed: { $addToSet: "$trackId" },
            completedPlayCount: {
                $sum: {
                    $cond: [{ $eq: ["$completed", true] }, 1, 0],
                },
            },
        },
    },
    {
        $project: {
            _id: 0,
            artistId: "$_id",
            playCount: 1,
            uniqueListeners: { $size: "$uniqueListeners" },
            completedPlayCount: 1,
            totalTracksPlayed: {
                $size: {
                    $filter: {
                        input: "$totalTracksPlayed",
                        as: "trackId",
                        cond: { $ne: ["$$trackId", null] },
                    },
                },
            },
            score: {
                $add: [
                    { $multiply: [{ $size: "$uniqueListeners" }, 5] },
                    "$completedPlayCount",
                    { $multiply: ["$playCount", 0.5] },
                ],
            },
        },
    },
]);

export const sortArtistRankingStats = (stats) =>
    [...stats].sort((left, right) => {
        if (right.score !== left.score) {
            return right.score - left.score;
        }

        if (right.uniqueListeners !== left.uniqueListeners) {
            return right.uniqueListeners - left.uniqueListeners;
        }

        if (right.playCount !== left.playCount) {
            return right.playCount - left.playCount;
        }

        return String(left.artistId).localeCompare(String(right.artistId));
    });

export const buildTopArtistRankings = (stats) =>
    sortArtistRankingStats(stats)
        .slice(0, ARTIST_TOP_RANKINGS_LIMIT)
        .map((stat, index) => ({
            artistId: stat.artistId,
            playCount: stat.playCount,
            uniqueListeners: stat.uniqueListeners,
            completedPlayCount: stat.completedPlayCount,
            totalTracksPlayed: stat.totalTracksPlayed,
            score: stat.score,
            rank: index + 1,
        }));

export const fillMissingArtistRankings = async (rankings) => {
    if (rankings.length >= ARTIST_TOP_RANKINGS_LIMIT) {
        return rankings;
    }

    const existingArtistIds = rankings.map((ranking) => ranking.artistId);
    const fillerArtists = await Artist.find({
        _id: { $nin: existingArtistIds },
        activeStatus: "active",
    })
        .sort({ "stats.totalStreams": -1, "stats.followers": -1, _id: 1 })
        .limit(ARTIST_TOP_RANKINGS_LIMIT - rankings.length)
        .select("_id")
        .lean();

    const fillerRankings = fillerArtists.map((artist) => ({
        artistId: artist._id,
        playCount: 0,
        uniqueListeners: 0,
        completedPlayCount: 0,
        totalTracksPlayed: 0,
        score: 0,
        rank: 0,
    }));

    return [...rankings, ...fillerRankings].map((ranking, index) => ({
        ...ranking,
        rank: index + 1,
    }));
};
