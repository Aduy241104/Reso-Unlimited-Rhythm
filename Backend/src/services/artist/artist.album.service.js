import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import Album from "../../models/Album.js";
import Artist from "../../models/Artist.js";
import ReleaseSchedule from "../../models/ReleaseSchedule.js";
import Track from "../../models/Track.js";
import { AppError } from "../../utils/AppError.js";
import { formatAlbumItem, formatAlbumDetail } from "../album/album.helper.js";
import {
    enrichAlbumWithTotalDuration,
    enrichAlbumsWithTotalDuration,
    syncAlbumTotalDuration,
} from "../album/album.sync.js";
import { uploadToCloudinary, deleteCloudinaryAssetByUrl } from "../../utils/uploadCloud.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const MIN_TRACKS_TO_PUBLISH_ALBUM = 2;

const getAlbumTrackCount = (album) =>
    Array.isArray(album?.trackList) ? album.trackList.length : 0;

const ensureAlbumCanBePublished = (album) => {
    if (getAlbumTrackCount(album) < MIN_TRACKS_TO_PUBLISH_ALBUM) {
        throw new AppError(
            `Album phải có ít nhất ${MIN_TRACKS_TO_PUBLISH_ALBUM} bài hát trước khi phát hành.`,
            StatusCodes.BAD_REQUEST,
            {
                field: "status",
            }
        );
    }
};

const ensureAlbumHasNotBeenPublished = async (album) => {
    if (["active", "hidden"].includes(album?.status)) {
        throw new AppError(
            "Album này đã được phát hành.",
            StatusCodes.CONFLICT,
            {
                field: "status",
                code: "ALBUM_ALREADY_RELEASED",
            }
        );
    }

    const existingRelease = await ReleaseSchedule.exists({
        type: "album",
        targetId: album?._id,
        status: { $in: ["scheduled", "released"] },
    });

    if (existingRelease) {
        throw new AppError(
            "Album này đã có lịch phát hành hoặc đã được phát hành.",
            StatusCodes.CONFLICT,
            {
                field: "status",
                code: "ALBUM_RELEASE_ALREADY_EXISTS",
            }
        );
    }
};

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
            "Không tìm thấy hồ sơ nghệ sĩ của tài khoản này.",
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

const getMyAlbumDetail = async (userId, albumId) => {
    if (!mongoose.Types.ObjectId.isValid(albumId)) {
        throw new AppError("Mã album không hợp lệ.", StatusCodes.BAD_REQUEST, {
            field: "id",
        });
    }

    const artist = await Artist.findOne({ userId });

    if (!artist) {
        throw new AppError(
            "Không tìm thấy hồ sơ nghệ sĩ của tài khoản này.",
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
        throw new AppError("Không tìm thấy album.", StatusCodes.NOT_FOUND);
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

const createAlbum = async (userId, payload, file) => {
    const artist = await Artist.findOne({ userId });

    if (!artist) {
        throw new AppError(
            "Không tìm thấy hồ sơ nghệ sĩ của tài khoản này.",
            StatusCodes.NOT_FOUND
        );
    }

    if (!payload.title || !payload.title.trim()) {
        throw new AppError("Tên album là bắt buộc.", StatusCodes.BAD_REQUEST, {
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
                "Không thể tải ảnh bìa lên. Vui lòng thử lại.",
                StatusCodes.INTERNAL_SERVER_ERROR
            );
        }
    }

    const album = new Album({
        title: payload.title.trim(),
        artistId: artist._id,
        coverImage: coverImageUrl,
        releaseDate: payload.releaseDate || null,
        status: "draft",
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
        throw new AppError("Mã album không hợp lệ.", StatusCodes.BAD_REQUEST, {
            field: "id",
        });
    }

    const artist = await Artist.findOne({ userId });

    if (!artist) {
        throw new AppError(
            "Không tìm thấy hồ sơ nghệ sĩ của tài khoản này.",
            StatusCodes.NOT_FOUND
        );
    }

    const album = await Album.findOne({
        _id: albumId,
        artistId: artist._id,
    });

    if (!album) {
        throw new AppError("Không tìm thấy album.", StatusCodes.NOT_FOUND);
    }

    // Validate title if provided
    if (payload.title !== undefined) {
        if (!payload.title.trim()) {
            throw new AppError("Tên album là bắt buộc.", StatusCodes.BAD_REQUEST, {
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
        if (payload.status === "active") {
            ensureAlbumCanBePublished(album);
            await ensureAlbumHasNotBeenPublished(album);
        }
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
                "Không thể tải ảnh bìa lên. Vui lòng thử lại.",
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
        throw new AppError("Mã album không hợp lệ.", StatusCodes.BAD_REQUEST, {
            field: "id",
        });
    }

    const artist = await Artist.findOne({ userId });

    if (!artist) {
        throw new AppError(
            "Không tìm thấy hồ sơ nghệ sĩ của tài khoản này.",
            StatusCodes.NOT_FOUND
        );
    }

    const album = await Album.findOne({
        _id: albumId,
        artistId: artist._id,
    });

    if (!album) {
        throw new AppError("Không tìm thấy album.", StatusCodes.NOT_FOUND);
    }

    if (album.status !== "active") {
        throw new AppError(
            "Chỉ có thể ẩn album đã phát hành.",
            StatusCodes.CONFLICT,
            {
                field: "status",
                code: "ALBUM_NOT_RELEASED",
            }
        );
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
        throw new AppError("Mã album không hợp lệ.", StatusCodes.BAD_REQUEST, {
            field: "id",
        });
    }

    const artist = await Artist.findOne({ userId });

    if (!artist) {
        throw new AppError(
            "Không tìm thấy hồ sơ nghệ sĩ của tài khoản này.",
            StatusCodes.NOT_FOUND
        );
    }

    const album = await Album.findOne({
        _id: albumId,
        artistId: artist._id,
    });

    if (!album) {
        throw new AppError("Không tìm thấy album.", StatusCodes.NOT_FOUND);
    }

    if (album.status !== "hidden") {
        throw new AppError(
            "Chỉ có thể hiển thị lại album đang bị ẩn.",
            StatusCodes.CONFLICT,
            {
                field: "status",
                code: "ALBUM_NOT_HIDDEN",
            }
        );
    }

    // Set album status back to active
    ensureAlbumCanBePublished(album);
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
        throw new AppError("Mã album không hợp lệ.", StatusCodes.BAD_REQUEST, {
            field: "albumId",
        });
    }

    if (!mongoose.Types.ObjectId.isValid(trackId)) {
        throw new AppError("Mã bài hát không hợp lệ.", StatusCodes.BAD_REQUEST, {
            field: "trackId",
        });
    }

    // Get artist
    const artist = await Artist.findOne({ userId });

    if (!artist) {
        throw new AppError(
            "Không tìm thấy hồ sơ nghệ sĩ của tài khoản này.",
            StatusCodes.NOT_FOUND
        );
    }

    // Check if album exists and belongs to artist
    const album = await Album.findOne({
        _id: albumId,
        artistId: artist._id,
    });

    if (!album) {
        throw new AppError("Không tìm thấy album.", StatusCodes.NOT_FOUND);
    }

    // Check if track exists and belongs to artist
    const track = await Track.findOne({
        _id: trackId,
        artist_artistId: artist._id,
    });

    if (!track) {
        throw new AppError("Không tìm thấy bài hát hoặc bài hát không thuộc quyền sở hữu của bạn.", StatusCodes.NOT_FOUND);
    }

    // Check if track is already in album
    const trackExists = album.trackList.some((item) => item.trackId.toString() === trackId.toString());
    
    if (trackExists) {
        throw new AppError(
            "Bài hát này đã có trong album.",
            StatusCodes.BAD_REQUEST,
            { field: "trackId" }
        );
    }

    const assignedAlbumId = track.album_albumId?.toString();

    if (assignedAlbumId && assignedAlbumId !== album._id.toString()) {
        throw new AppError(
            "Bài hát này đã thuộc một album khác.",
            StatusCodes.CONFLICT,
            {
                field: "trackId",
                code: "TRACK_ALREADY_ASSIGNED_TO_ALBUM",
            }
        );
    }

    // Handle legacy records where trackList was updated without synchronizing
    // album_albumId on the track document.
    const legacyAlbumMembership = await Album.exists({
        _id: { $ne: album._id },
        artistId: artist._id,
        "trackList.trackId": track._id,
    });

    if (legacyAlbumMembership) {
        throw new AppError(
            "Bài hát này đã thuộc một album khác.",
            StatusCodes.CONFLICT,
            {
                field: "trackId",
                code: "TRACK_ALREADY_ASSIGNED_TO_ALBUM",
            }
        );
    }

    const trackAssignment = await Track.updateOne(
        {
            _id: track._id,
            artist_artistId: artist._id,
            $or: [
                { album_albumId: null },
                { album_albumId: album._id },
            ],
        },
        { $set: { album_albumId: album._id } }
    );

    if (trackAssignment.matchedCount === 0) {
        throw new AppError(
            "Bài hát này đã thuộc một album khác.",
            StatusCodes.CONFLICT,
            {
                field: "trackId",
                code: "TRACK_ALREADY_ASSIGNED_TO_ALBUM",
            }
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

    try {
        await syncAlbumTotalDuration(album);
        await album.save();
    } catch (error) {
        if (!assignedAlbumId) {
            await Track.updateOne(
                {
                    _id: track._id,
                    album_albumId: album._id,
                },
                { $unset: { album_albumId: "" } }
            );
        }
        throw error;
    }

    // Populate and return
    const populated = await album.populate({
        path: "artistId",
        select: "name avatar coverImage",
    });

    return formatAlbumItem(populated.toObject());
};

const removeTrackFromAlbum = async (userId, albumId, trackId) => {
    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(albumId)) {
        throw new AppError("Mã album không hợp lệ.", StatusCodes.BAD_REQUEST, {
            field: "albumId",
        });
    }

    if (!mongoose.Types.ObjectId.isValid(trackId)) {
        throw new AppError("Mã bài hát không hợp lệ.", StatusCodes.BAD_REQUEST, {
            field: "trackId",
        });
    }

    // Get artist
    const artist = await Artist.findOne({ userId });

    if (!artist) {
        throw new AppError(
            "Không tìm thấy hồ sơ nghệ sĩ của tài khoản này.",
            StatusCodes.NOT_FOUND
        );
    }

    // Check if album exists and belongs to artist
    const album = await Album.findOne({
        _id: albumId,
        artistId: artist._id,
    });

    if (!album) {
        throw new AppError("Không tìm thấy album.", StatusCodes.NOT_FOUND);
    }

    // Check if track exists in album
    const trackIndex = album.trackList.findIndex(
        (item) => item.trackId.toString() === trackId.toString()
    );

    if (trackIndex === -1) {
        throw new AppError(
            "Bài hát không nằm trong album này.",
            StatusCodes.NOT_FOUND,
            { field: "trackId" }
        );
    }

    if (
        ["active", "hidden"].includes(album.status) &&
        getAlbumTrackCount(album) <= MIN_TRACKS_TO_PUBLISH_ALBUM
    ) {
        throw new AppError(
            `Album đã phát hành phải giữ lại ít nhất ${MIN_TRACKS_TO_PUBLISH_ALBUM} bài hát.`,
            StatusCodes.CONFLICT,
            {
                field: "trackId",
                code: "RELEASED_ALBUM_MIN_TRACKS_REQUIRED",
            }
        );
    }

    // Remove track from trackList
    album.trackList.splice(trackIndex, 1);

    const trackUnassignment = await Track.updateOne(
        {
            _id: trackId,
            artist_artistId: artist._id,
            album_albumId: album._id,
        },
        { $unset: { album_albumId: "" } }
    );

    try {
        // Reorder remaining tracks
        album.trackList.forEach((item, index) => {
            item.order = index + 1;
        });

        await syncAlbumTotalDuration(album);
        await album.save();
    } catch (error) {
        if (trackUnassignment.modifiedCount > 0) {
            await Track.updateOne(
                {
                    _id: trackId,
                    album_albumId: null,
                },
                { $set: { album_albumId: album._id } }
            );
        }
        throw error;
    }

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
    removeTrackFromAlbum,
};
