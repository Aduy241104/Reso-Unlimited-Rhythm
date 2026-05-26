import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import Album from "../../models/Album.js";
import Artist from "../../models/Artist.js";
import Track from "../../models/Track.js";
import { AppError } from "../../utils/AppError.js";
import { formatAlbumItem, formatAlbumDetail } from "../album/album.helper.js";
import { uploadToCloudinary } from "../../utils/uploadCloud.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const normalizePositiveInteger = (value, fallback) => {
    const parsedValue = Number.parseInt(value, 10);
    if (Number.isNaN(parsedValue) || parsedValue < 1) {
        return fallback;
    }
    return parsedValue;
};

const getMyAlbums = async (userId, query = {}) => {
    const artist = await Artist.findOne({ userId });

    if (!artist) {
        throw new AppError(
            "Artist profile not found for this account.",
            StatusCodes.NOT_FOUND
        );
    }

    const page = normalizePositiveInteger(query.page, DEFAULT_PAGE);
    const requestedLimit = normalizePositiveInteger(query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;

    const filter = {
        artistId: artist._id,
    };

    const [albums, total] = await Promise.all([
        Album.find(filter)
            .sort({ releaseDate: -1, createdAt: -1, _id: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
                path: "artistId",
                select: "name avatar coverImage",
            })
            .lean(),
        Album.countDocuments(filter),
    ]);

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

const getMyAlbumDetail = async (userId, albumId) => {
    if (!mongoose.Types.ObjectId.isValid(albumId)) {
        throw new AppError("Album id is invalid.", StatusCodes.BAD_REQUEST, {
            field: "id",
        });
    }

    const artist = await Artist.findOne({ userId });

    if (!artist) {
        throw new AppError(
            "Artist profile not found for this account.",
            StatusCodes.NOT_FOUND
        );
    }

    const album = await Album.findOne({
        _id: albumId,
        artistId: artist._id,
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
        throw new AppError("Album not found.", StatusCodes.NOT_FOUND);
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

    return formatAlbumDetail(album);
};

const createAlbum = async (userId, payload, file) => {
    const artist = await Artist.findOne({ userId });

    if (!artist) {
        throw new AppError(
            "Artist profile not found for this account.",
            StatusCodes.NOT_FOUND
        );
    }

    if (!payload.title || !payload.title.trim()) {
        throw new AppError("Album title is required.", StatusCodes.BAD_REQUEST, {
            field: "title",
        });
    }

    let coverImageUrl = "";

    // Upload cover image to Cloudinary if file is provided
    if (file) {
        try {
            const result = await uploadToCloudinary(
                file.buffer,
                "albums/cover",
                "image"
            );
            coverImageUrl = result.secure_url;
        } catch (uploadError) {
            console.error("Failed to upload cover image:", uploadError.message);
            throw new AppError(
                "Failed to upload cover image. Please try again.",
                StatusCodes.INTERNAL_SERVER_ERROR
            );
        }
    }

    const album = new Album({
        title: payload.title.trim(),
        artistId: artist._id,
        coverImage: coverImageUrl,
        releaseDate: payload.releaseDate || null,
        status: payload.status || "active",
        trackList: [],
    });

    await album.save();

    const populated = await album.populate({
        path: "artistId",
        select: "name avatar coverImage",
    });

    return formatAlbumItem(populated.toObject());
};

export default {
    getMyAlbums,
    getMyAlbumDetail,
    createAlbum,
};
