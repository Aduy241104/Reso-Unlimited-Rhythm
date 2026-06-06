import Interaction from "../../models/Interaction.js";
import Artist from "../../models/Artist.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

const normalizePositiveInteger = (value, fallback) => {
    const parsedValue = Number.parseInt(value, 10);

    if (Number.isNaN(parsedValue) || parsedValue <= 0) {
        return fallback;
    }

    return parsedValue;
};

const formatListfollowArtist = (artist, interaction) => ({
    id: artist._id.toString(),
    name: artist.name,
    avatar: artist.avatar || "",
    coverImage: artist.coverImage || "",
    bio: artist.bio || "",
    followers: Number(artist.stats?.followers) || 0,
    verificationStatus: artist.verificationStatus || "pending",
    followedAt: interaction.createdAt,
    isFollowing: true,
});

const getUserListfollowArtists = async (userId, query = {}) => {
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
            .sort({ createdAt: -1, _id: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Interaction.countDocuments(filter),
    ]);

    const artistIds = interactions.map((interaction) => interaction.targetId);
    const artists = await Artist.find({
        _id: { $in: artistIds },
        activeStatus: "active",
    }).lean();

    const artistMap = new Map(artists.map((artist) => [artist._id.toString(), artist]));

    const artistsList = interactions
        .map((interaction) => {
            const artist = artistMap.get(interaction.targetId.toString());

            if (!artist) {
                return null;
            }

            return formatListfollowArtist(artist, interaction);
        })
        .filter(Boolean);

    return {
        artists: artistsList,
        pagination: {
            page,
            limit,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
    };
};

export default {
    getUserListfollowArtists,
};
