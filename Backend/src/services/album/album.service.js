import mongoose from "mongoose";
import Album from "../../models/Album.js";
import { AppError } from "../../utils/AppError.js";
import {
    formatAlbumDetail,
    formatAlbumItem,
    normalizePositiveInteger,
} from "./album.helper.js";

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
            .sort({ releaseDate: -1, totalPlays: -1, createdAt: -1, _id: -1 })
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

    return formatAlbumDetail(album);
};

export default {
    getAlbumList,
    getAlbumDetail,
};
