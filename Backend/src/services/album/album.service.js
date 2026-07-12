import mongoose from "mongoose";
import Album from "../../models/Album.js";
import Artist from "../../models/Artist.js";
import Interaction from "../../models/Interaction.js";
import Track from "../../models/Track.js";
import { AppError } from "../../utils/AppError.js";
import {
    formatAlbumDetail,
    formatAlbumFollowState,
    formatAlbumItem,
    normalizePositiveInteger,
} from "./album.helper.js";
import {
    enrichAlbumWithTotalDuration,
    enrichAlbumsWithTotalDuration,
} from "./album.sync.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const ALBUM_FOLLOW_ACTION = "follow";
const ALBUM_FOLLOW_TARGET_TYPE = "Album";

const validateAlbumId = (albumId) => {
    if (!mongoose.Types.ObjectId.isValid(albumId)) {
        throw new AppError("Album id is invalid.", 400, {
            field: "id",
        });
    }

    return albumId;
};

const getActiveAlbumOrThrow = async (albumId) => {
    const normalizedAlbumId = validateAlbumId(albumId);

    const album = await Album.findOne({
        _id: normalizedAlbumId,
        status: "active",
    }).select("_id");

    if (!album) {
        throw new AppError("Album not found.", 404);
    }

    return album;
};

const buildAlbumFollowFilter = (userId, albumId) => ({
    userId,
    targetType: ALBUM_FOLLOW_TARGET_TYPE,
    targetId: albumId,
    action: ALBUM_FOLLOW_ACTION,
});

const getAlbumList = async (query = {}) => {
    const page = normalizePositiveInteger(query.page, DEFAULT_PAGE);
    const requestedLimit = normalizePositiveInteger(query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;

    const filter = {
        status: "active",
    };

    const [albums, total] = await Promise.all([
        Album.find(filter)
            .sort({ releaseDate: -1, totalDuration: -1, createdAt: -1, _id: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
                path: "artistId",
                select: "name avatar coverImage",
            })
            .lean(),
        Album.countDocuments(filter),
    ]);

    await enrichAlbumsWithTotalDuration(albums);

    return {
        albums: albums.map(formatAlbumItem),
        pagination: {
            page,
            limit,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
    };
};

const getAlbumDetail = async (albumId) => {
    validateAlbumId(albumId);

    const album = await Album.findOne({
        _id: albumId,
        status: "active",
    })
        .populate({
            path: "artistId",
            select: [
                "name",
                "bio",
                "avatar",
                "coverImage",
                "activeStatus",
                "stats",
            ].join(" "),
        })
        .populate({
            path: "trackList.trackId",
            select: [
                "title",
                "duration",
                "avatar",
                "coverImage",
                "audioFiles",
                "lyricsStatic",
                "lyricsSyncUrl",
                "stats",
                "releaseDate",
                "activeStatus",
                "approvalStatus",
                "artist_artistId",
            ].join(" "),
            populate: {
                path: "artist_artistId",
                select: "name avatar coverImage",
            },
        })
        .lean();

    if (!album) {
        throw new AppError("Album not found.", 404);
    }

    const trackSelect = [
        "title",
        "duration",
        "avatar",
        "coverImage",
        "audioFiles",
        "lyricsStatic",
        "lyricsSyncUrl",
        "stats",
        "releaseDate",
        "activeStatus",
        "approvalStatus",
        "artist_artistId",
    ].join(" ");

    const listedTrackIds = (album.trackList || [])
        .map((entry) => {
            const ref = entry.trackId;
            if (!ref) {
                return null;
            }

            return ref._id ? ref._id : ref;
        })
        .filter(Boolean);

    const maxOrder = (album.trackList || []).reduce(
        (max, entry) =>
            typeof entry.order === "number" && entry.order > max ? entry.order : max,
        0
    );

    const orphanTracks = await Track.find({
        album_albumId: album._id,
        _id: { $nin: listedTrackIds },
    })
        .select(trackSelect)
        .populate({
            path: "artist_artistId",
            select: "name avatar coverImage",
        })
        .lean();

    if (orphanTracks.length > 0) {
        const supplemental = orphanTracks.map((track, index) => ({
            order: maxOrder + index + 1,
            trackId: track,
        }));

        album.trackList = [...(album.trackList || []), ...supplemental];
    }

    await enrichAlbumWithTotalDuration(album);

    return formatAlbumDetail(album);
};

const followAlbum = async (userId, albumId) => {
    if (!userId) {
        throw new AppError("Unauthorized.", 401);
    }

    const album = await getActiveAlbumOrThrow(albumId);
    const followFilter = buildAlbumFollowFilter(userId, album._id);

    const existingFollow = await Interaction.findOne(followFilter)
        .select("_id")
        .lean();

    if (!existingFollow) {
        try {
            await Interaction.create(followFilter);
        } catch (error) {
            if (error?.code !== 11000) {
                throw error;
            }
        }
    }

    return formatAlbumFollowState({
        albumId: album._id,
        isFollowing: true,
    });
};

const unfollowAlbum = async (userId, albumId) => {
    if (!userId) {
        throw new AppError("Unauthorized.", 401);
    }

    const album = await getActiveAlbumOrThrow(albumId);

    await Interaction.deleteOne(buildAlbumFollowFilter(userId, album._id));

    return formatAlbumFollowState({
        albumId: album._id,
        isFollowing: false,
    });
};

const getAlbumFollowStatus = async (userId, albumId) => {
    if (!userId) {
        throw new AppError("Unauthorized.", 401);
    }

    const album = await getActiveAlbumOrThrow(albumId);
    const existingFollow = await Interaction.findOne(
        buildAlbumFollowFilter(userId, album._id)
    )
        .select("_id")
        .lean();

    return formatAlbumFollowState({
        albumId: album._id,
        isFollowing: Boolean(existingFollow),
    });
};

const toggleFollowAlbum = async (userId, albumId) => {
    if (!userId) {
        throw new AppError("Unauthorized.", 401);
    }

    const album = await getActiveAlbumOrThrow(albumId);
    const followFilter = buildAlbumFollowFilter(userId, album._id);
    const existingFollow = await Interaction.findOne(followFilter)
        .select("_id")
        .lean();

    if (existingFollow) {
        await Interaction.deleteOne({ _id: existingFollow._id });

        return {
            action: "unfollowed",
            follow: formatAlbumFollowState({
                albumId: album._id,
                isFollowing: false,
            }),
        };
    }

    try {
        await Interaction.create(followFilter);
    } catch (error) {
        if (error?.code !== 11000) {
            throw error;
        }
    }

    return {
        action: "followed",
        follow: formatAlbumFollowState({
            albumId: album._id,
            isFollowing: true,
        }),
    };
};

const getArtistAlbums = async (userId) => {
    // Find artist by userId
    const artist = await Artist.findOne({ userId });

    if (!artist) {
        throw new AppError("Artist profile not found.", 404);
    }

    // Get all albums for this artist
    const albums = await Album.find({
        artistId: artist._id,
    })
        .select("_id title coverImage status releaseDate")
        .sort({ releaseDate: -1, createdAt: -1 })
        .lean();

    return albums;
};

export default {
    followAlbum,
    getAlbumList,
    getAlbumDetail,
    getAlbumFollowStatus,
    getArtistAlbums,
    toggleFollowAlbum,
    unfollowAlbum,
};
