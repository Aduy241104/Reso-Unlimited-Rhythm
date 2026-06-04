import Interaction from "../../models/Interaction.js";
import {
    formatFollowedArtist,
    normalizePositiveInteger,
} from "./libary.service.helper.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const getMyFollowedArtistsByUserId = async (userId, query = {}) => {
    const page = normalizePositiveInteger(query.page, DEFAULT_PAGE);
    const requestedLimit = normalizePositiveInteger(query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;

    const filter = {
        userId,
        targetType: "Artist",
        action: "follow",
    };

    const [interactions, total] = await Promise.all([
        Interaction.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
                path: "targetId",
                select: "name avatar activeStatus",
                match: { activeStatus: "active" },
            })
            .lean(),
        Interaction.countDocuments(filter),
    ]);

    return {
        artists: interactions.map(formatFollowedArtist).filter(Boolean),
        pagination: {
            page,
            limit,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
    };
};

export default {
    getMyFollowedArtistsByUserId,
};
