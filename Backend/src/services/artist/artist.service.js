import mongoose from "mongoose";
import Album from "../../models/Album.js";
import Artist from "../../models/Artist.js";
import ArtistStat from "../../models/ArtistStat.js";
import Track from "../../models/Track.js";
import { AppError } from "../../utils/AppError.js";
import {
    formatArtistProfile,
    formatArtistTrack,
    normalizePositiveInteger,
} from "./artist.helper.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const validateAndGetArtist = async (artistId) => {
    if (!mongoose.Types.ObjectId.isValid(artistId)) {
        throw new AppError("Artist id is invalid.", 400, {
            field: "id",
        });
    }

    const artist = await Artist.findOne({
        _id: artistId,
        activeStatus: "active",
    }).lean();

    if (!artist) {
        throw new AppError("Artist not found.", 404);
    }

    return artist;
};

const getArtistProfile = async (artistId) => {
    const artist = await validateAndGetArtist(artistId);

    const [artistStat, albums, tracks] = await Promise.all([
        ArtistStat.findOne({
            artistId,
        }).lean(),
        Album.find({
            artistId,
            status: "active",
        })
            .sort({ releaseDate: -1, totalPlays: -1, createdAt: -1, _id: -1 })
            .lean(),
        Track.find({
            artist_artistId: artistId,
            activeStatus: "active",
            approvalStatus: "approved",
        })
            .sort({ releaseDate: -1, "stats.totalPlay": -1, createdAt: -1, _id: -1 })
            .populate({
                path: "album_albumId",
                select: "title coverImage releaseDate",
                match: { status: "active" },
            })
            .lean(),
    ]);

    return formatArtistProfile({
        artist,
        artistStat,
        albums,
        tracks,
    });
};

const getArtistTracks = async (artistId, query = {}) => {
    await validateAndGetArtist(artistId);

    const page = normalizePositiveInteger(query.page, DEFAULT_PAGE);
    const requestedLimit = normalizePositiveInteger(query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;

    const filter = {
        artist_artistId: artistId,
        activeStatus: "active",
        approvalStatus: "approved",
    };

    const [tracks, total] = await Promise.all([
        Track.find(filter)
            .sort({ releaseDate: -1, "stats.totalPlay": -1, createdAt: -1, _id: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
                path: "album_albumId",
                select: "title coverImage releaseDate",
                match: { status: "active" },
            })
            .lean(),
        Track.countDocuments(filter),
    ]);

    return {
        tracks: tracks.map(formatArtistTrack),
        pagination: {
            page,
            limit,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
    };
};

export default {
    getArtistProfile,
    getArtistTracks,
};
