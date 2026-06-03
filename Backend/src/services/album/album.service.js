import mongoose from "mongoose";
import Album from "../../models/Album.js";
import Artist from "../../models/Artist.js";
import Track from "../../models/Track.js";
import { AppError } from "../../utils/AppError.js";
import {
    formatAlbumDetail,
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
    if (!mongoose.Types.ObjectId.isValid(albumId)) {
        throw new AppError("Album id is invalid.", 400, {
            field: "id",
        });
    }

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
                "verificationStatus",
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
    getAlbumList,
    getAlbumDetail,
    getArtistAlbums,
};
