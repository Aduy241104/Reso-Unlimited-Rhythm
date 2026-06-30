import Artist from "../../models/Artist.js";
import Interaction from "../../models/Interaction.js";

const ARTIST_FOLLOWER_POPULATE = {
    path: "userId",
    select: "profile.fullName avatar",
};

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

export { findArtistByUserId, findArtistFollowers, countArtistFollowers };

export default {
    findArtistByUserId,
    findArtistFollowers,
    countArtistFollowers,
};
