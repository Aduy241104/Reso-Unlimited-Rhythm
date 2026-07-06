import Artist from "../../models/Artist.js";
import Interaction from "../../models/Interaction.js";

const ARTIST_FOLLOWER_POPULATE = {
    path: "userId",
    select: "profile.fullName avatar",
};
const ANALYTICS_TIMEZONE =
    process.env.ANALYTICS_TIMEZONE ||
    process.env.CRON_TIMEZONE ||
    "Asia/Ho_Chi_Minh";

const findArtistByUserId = async (userId) => {
    return await Artist.findOne({ userId })
        .select("_id name")
        .lean();
};

const findArtistFollowers = async (filter, options = {}) => {
    const skip = Number(options.skip) || 0;
    const limit = Number(options.limit) || 10;

    return await Interaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(ARTIST_FOLLOWER_POPULATE)
        .lean();
};

const countArtistFollowers = async (filter) => {
    return await Interaction.countDocuments(filter);
};

const aggregateArtistFollowerGrowth = async (filter, { format, keyName }) => {
    return await Interaction.aggregate([
        { $match: filter },
        {
            $group: {
                _id: {
                    $dateToString: {
                        format,
                        date: "$createdAt",
                        timezone: ANALYTICS_TIMEZONE,
                    },
                },
                count: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
        {
            $project: {
                _id: 0,
                [keyName]: "$_id",
                count: 1,
            },
        },
    ]);
};

const getArtistDailyFollowerGrowth = async (filter) => {
    return await aggregateArtistFollowerGrowth(filter, {
        format: "%Y-%m-%d",
        keyName: "date",
    });
};

const getArtistMonthlyFollowerGrowth = async (filter) => {
    return await aggregateArtistFollowerGrowth(filter, {
        format: "%Y-%m",
        keyName: "month",
    });
};

export {
    findArtistByUserId,
    findArtistFollowers,
    countArtistFollowers,
    getArtistDailyFollowerGrowth,
    getArtistMonthlyFollowerGrowth,
};

export default {
    findArtistByUserId,
    findArtistFollowers,
    countArtistFollowers,
    getArtistDailyFollowerGrowth,
    getArtistMonthlyFollowerGrowth,
};
