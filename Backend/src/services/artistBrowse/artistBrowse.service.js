import mongoose from "mongoose";
import Album from "../../models/Album.js";
import Artist from "../../models/Artist.js";
import ReleaseSchedule from "../../models/ReleaseSchedule.js";
import ArtistStat from "../../models/ArtistStat.js";
import Track from "../../models/Track.js";
import { AppError } from "../../utils/AppError.js";
import {
    formatArtistAlbum,
    formatArtistComingRelease,
    formatArtistProfile,
    formatArtistTrack,
    normalizePositiveInteger,
} from "./artistBrowse.helper.js";

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

const getArtistAlbums = async (artistId, query = {}) => {
    await validateAndGetArtist(artistId);

    const page = normalizePositiveInteger(query.page, DEFAULT_PAGE);
    const requestedLimit = normalizePositiveInteger(query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;

    const filter = {
        artistId,
        status: "active",
    };

    const [albums, total] = await Promise.all([
        Album.find(filter)
            .sort({ releaseDate: -1, totalPlays: -1, createdAt: -1, _id: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Album.countDocuments(filter),
    ]);

    return {
        albums: albums.map(formatArtistAlbum),
        pagination: {
            page,
            limit,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
    };
};

const getArtistComingReleases = async (artistId, query = {}) => {
    await validateAndGetArtist(artistId);

    const page = normalizePositiveInteger(query.page, DEFAULT_PAGE);
    const requestedLimit = normalizePositiveInteger(query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;
    const now = new Date();

    const filter = {
        artistId,
        status: "scheduled",
        scheduledAt: { $gte: now },
    };

    const [schedules, total] = await Promise.all([
        ReleaseSchedule.find(filter)
            .sort({ scheduledAt: 1, createdAt: 1, _id: 1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        ReleaseSchedule.countDocuments(filter),
    ]);

    const albumIds = schedules
        .filter((schedule) => schedule.type === "album")
        .map((schedule) => schedule.targetId);
    const trackIds = schedules
        .filter((schedule) => schedule.type === "track")
        .map((schedule) => schedule.targetId);

    const [albums, tracks] = await Promise.all([
        albumIds.length > 0
            ? Album.find({
                _id: { $in: albumIds },
                artistId,
            }).lean()
            : [],
        trackIds.length > 0
            ? Track.find({
                _id: { $in: trackIds },
                artist_artistId: artistId,
            }).lean()
            : [],
    ]);

    const albumMap = new Map(albums.map((album) => [album._id.toString(), album]));
    const trackMap = new Map(tracks.map((track) => [track._id.toString(), track]));

    return {
        comingReleases: schedules
            .map((schedule) => {
                const target =
                    schedule.type === "album"
                        ? albumMap.get(schedule.targetId.toString())
                        : trackMap.get(schedule.targetId.toString());

                if (!target) {
                    return null;
                }

                return formatArtistComingRelease({ schedule, target });
            })
            .filter(Boolean),
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
    getArtistAlbums,
    getArtistComingReleases,
    getArtistTracks,
};
