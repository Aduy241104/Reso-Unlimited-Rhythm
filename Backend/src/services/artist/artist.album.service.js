import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import Album from "../../models/Album.js";
import Artist from "../../models/Artist.js";
import Track from "../../models/Track.js";
import { AppError } from "../../utils/AppError.js";
import { formatAlbumItem, formatAlbumDetail } from "../album/album.helper.js";
import { uploadToCloudinary, deleteCloudinaryAssetByUrl } from "../../utils/uploadCloud.js";

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

const updateAlbum = async (userId, albumId, payload, file) => {
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
    });

    if (!album) {
        throw new AppError("Album not found.", StatusCodes.NOT_FOUND);
    }

    // Validate title if provided
    if (payload.title !== undefined) {
        if (!payload.title.trim()) {
            throw new AppError("Album title is required.", StatusCodes.BAD_REQUEST, {
                field: "title",
            });
        }
        album.title = payload.title.trim();
    }

    // Update releaseDate if provided
    if (payload.releaseDate !== undefined) {
        album.releaseDate = payload.releaseDate ? new Date(payload.releaseDate) : null;
    }

    // Update status if provided
    if (payload.status !== undefined) {
        album.status = payload.status;
    }

    // Handle cover image upload if file is provided
    if (file) {
        try {
            // Delete old cover image if it exists
            if (album.coverImage) {
                try {
                    await deleteCloudinaryAssetByUrl(album.coverImage);
                    console.log("Old cover image deleted from Cloudinary");
                } catch (deleteError) {
                    console.warn("Failed to delete old cover image:", deleteError.message);
                    // Don't throw - continue with upload even if delete fails
                }
            }

            const result = await uploadToCloudinary(
                file.buffer,
                "albums/cover",
                "image"
            );
            album.coverImage = result.secure_url;
        } catch (uploadError) {
            console.error("Failed to upload cover image:", uploadError.message);
            throw new AppError(
                "Failed to upload cover image. Please try again.",
                StatusCodes.INTERNAL_SERVER_ERROR
            );
        }
    }

    await album.save();

    const populated = await album.populate({
        path: "artistId",
        select: "name avatar coverImage",
    });

    return formatAlbumItem(populated.toObject());
};

const hideAlbum = async (userId, albumId) => {
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
    });

    if (!album) {
        throw new AppError("Album not found.", StatusCodes.NOT_FOUND);
    }

    // Set album status to hidden
    album.status = "hidden";
    await album.save();

    const populated = await album.populate({
        path: "artistId",
        select: "name avatar coverImage",
    });

    return formatAlbumItem(populated.toObject());
};

const unhideAlbum = async (userId, albumId) => {
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
    });

    if (!album) {
        throw new AppError("Album not found.", StatusCodes.NOT_FOUND);
    }

    // Set album status back to active
    album.status = "active";
    await album.save();

    const populated = await album.populate({
        path: "artistId",
        select: "name avatar coverImage",
    });

    return formatAlbumItem(populated.toObject());
};

const addTrackToAlbum = async (userId, albumId, trackId) => {
    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(albumId)) {
        throw new AppError("Album id is invalid.", StatusCodes.BAD_REQUEST, {
            field: "albumId",
        });
    }

    if (!mongoose.Types.ObjectId.isValid(trackId)) {
        throw new AppError("Track id is invalid.", StatusCodes.BAD_REQUEST, {
            field: "trackId",
        });
    }

    // Get artist
    const artist = await Artist.findOne({ userId });

    if (!artist) {
        throw new AppError(
            "Artist profile not found for this account.",
            StatusCodes.NOT_FOUND
        );
    }

    // Check if album exists and belongs to artist
    const album = await Album.findOne({
        _id: albumId,
        artistId: artist._id,
    });

    if (!album) {
        throw new AppError("Album not found.", StatusCodes.NOT_FOUND);
    }

    // Check if track exists and belongs to artist
    const track = await Track.findOne({
        _id: trackId,
        artist_artistId: artist._id,
    });

    if (!track) {
        throw new AppError("Track not found or does not belong to you.", StatusCodes.NOT_FOUND);
    }

    // Check if track is already in album
    const trackExists = album.trackList.some((item) => item.trackId.toString() === trackId.toString());
    
    if (trackExists) {
        throw new AppError(
            "This track is already in the album.",
            StatusCodes.BAD_REQUEST,
            { field: "trackId" }
        );
    }

    // Calculate the next order number
    const maxOrder = album.trackList.length > 0
        ? Math.max(...album.trackList.map((item) => item.order || 0))
        : 0;

    // Add track to trackList
    album.trackList.push({
        trackId: new mongoose.Types.ObjectId(trackId),
        order: maxOrder + 1,
    });

    await album.save();

    // Populate and return
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
    updateAlbum,
    hideAlbum,
    unhideAlbum,
    addTrackToAlbum,
};
