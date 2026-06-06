import Interaction from "../../models/Interaction.js";
import Album from "../../models/Album.js";
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

const formatListfollowAlbum = (album, artist, interaction) => ({
    id: album._id.toString(),
    title: album.title || "Untitled Album",
    coverImage: album.coverImage || "",
    releaseDate: album.releaseDate || null,
    totalDuration: Number(album.totalDuration) || 0,
    trackCount: Array.isArray(album.trackList) ? album.trackList.length : 0,
    artist: artist
        ? {
              id: artist._id.toString(),
              name: artist.name || "Unknown artist",
              avatar: artist.avatar || "",
          }
        : null,
    status: album.status || "draft",
    followedAt: interaction.createdAt,
    isFollowing: true,
});

const getUserListfollowAlbums = async (userId, query = {}) => {
    const page = normalizePositiveInteger(query.page, DEFAULT_PAGE);
    const requestedLimit = normalizePositiveInteger(query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;

    const filter = {
        userId,
        targetType: "Album",
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

    const albumIds = interactions.map((interaction) => interaction.targetId);

    const albums = await Album.find({
        _id: { $in: albumIds },
        status: "active",
    }).lean();

    const rawArtistIds = albums.map((album) => {
        if (!album.artistId) return null;
        return album.artistId.toString();
    });
    const artistIds = [...new Set(rawArtistIds.filter(Boolean))];

    const artists = await Artist.find({
        _id: { $in: artistIds },
        activeStatus: "active",
    }).lean();

    const albumMap = new Map(albums.map((album) => [album._id.toString(), album]));
    const artistMap = new Map(artists.map((artist) => [artist._id.toString(), artist]));

    const albumsList = interactions
        .map((interaction) => {
            const album = albumMap.get(interaction.targetId.toString());

            if (!album) {
                return null;
            }

            const artist = album.artistId ? artistMap.get(album.artistId.toString()) : null;

            return formatListfollowAlbum(album, artist, interaction);
        })
        .filter(Boolean);

    return {
        albums: albumsList,
        pagination: {
            page,
            limit,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
    };
};

const unfollowAlbum = async (userId, albumId) => {
    if (!userId || !albumId) {
        const { AppError } = await import("../../utils/AppError.js");
        throw new AppError("Invalid user or album", 400);
    }

    const deletedInteraction = await Interaction.findOneAndDelete({
        userId,
        targetType: "Album",
        targetId: albumId,
        action: "follow",
    }).lean();

    if (!deletedInteraction) {
        const { AppError } = await import("../../utils/AppError.js");
        throw new AppError("Album is not being followed", 404);
    }

    return { albumId, isFollowing: false };
};

export default {
    getUserListfollowAlbums,
    unfollowAlbum,
};
