import { AppError } from "../../utils/AppError.js";
import {
    countArtistFollowers,
    findArtistByUserId,
    findArtistFollowers,
    getArtistDailyFollowerGrowth,
    getArtistMonthlyFollowerGrowth,
} from "./artist.follower.service.helper.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const normalizePositiveInteger = (value, fallbackValue) => {
    const normalizedValue = Number(value);

    if (!Number.isFinite(normalizedValue) || normalizedValue < 1) {
        return fallbackValue;
    }

    return Math.floor(normalizedValue);
};

const formatFollowerItem = (interaction) => {
    const user = interaction?.userId;

    if (!user?._id) {
        return null;
    }

    return {
        userId: user._id.toString(),
        fullName: user.profile?.fullName || "",
        avatar: user.avatar || "",
        followedAt: interaction.createdAt || null,
    };
};

const getArtistFollowers = async (loggedInUserId, query = {}) => {
    if (!loggedInUserId) {
        throw new AppError("Unauthorized.", 401);
    }

    const artist = await findArtistByUserId(loggedInUserId);

    if (!artist) {
        throw new AppError("Artist not found.", 404, {
            field: "artistId",
        });
    }

    const page = normalizePositiveInteger(query.page, DEFAULT_PAGE);
    const requestedLimit = normalizePositiveInteger(query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;

    const filter = {
        targetType: "Artist",
        targetId: artist._id,
        action: "follow",
    };

    const [followers, totalItems, dailyGrowth, monthlyGrowth] = await Promise.all([
        findArtistFollowers(filter, { skip, limit }),
        countArtistFollowers(filter),
        getArtistDailyFollowerGrowth(filter),
        getArtistMonthlyFollowerGrowth(filter),
    ]);

    return {
        artist: {
            artistId: artist._id.toString(),
            name: artist.name || "",
        },
        followers: {
            items: followers.map(formatFollowerItem).filter(Boolean),
            pagination: {
                page,
                limit,
                totalItems,
                totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
            },
        },
        statistics: {
            dailyGrowth,
            monthlyGrowth,
        },
    };
};

export { getArtistFollowers };

export default {
    getArtistFollowers,
};
