import mongoose from "mongoose";
import Genre from "../../models/Genre.js";
import Track from "../../models/Track.js";
import { AppError } from "../../utils/AppError.js";
import {
    buildGenreDetailFilter,
    buildGenreListFilter,
    buildGenreTracksFilter,
    normalizePagination,
} from "./user.genre.service.helper.js";
import { publicArtistMatch } from "../artist/artist.status.helper.js";

const GENRE_TRACK_SELECT_FIELDS = [
    "title",
    "artist_artistId",
    "album_albumId",
    "duration",
    "versionTitle",
    "avatar",
    "coverImage",
    "stats",
    "releaseDate",
    "activeStatus",
    "approvalStatus",
].join(" ");

const getGenreList = async () => {
    const filter = buildGenreListFilter();

    return await Genre.find(filter)
        .sort({ name: 1 })
        .lean();
};

const getGenreTracksByGenreId = async (genreId, query = {}) => {
    if (!mongoose.Types.ObjectId.isValid(genreId)) {
        throw new AppError("Genre id is invalid.", 400, {
            field: "genreId",
        });
    }

    const genre = await Genre.findOne(buildGenreDetailFilter(genreId)).lean();

    if (!genre) {
        throw new AppError("Genre not found.", 404, {
            field: "genreId",
        });
    }

    const { page, limit, skip } = normalizePagination(query);
    const trackFilter = buildGenreTracksFilter(genreId);

    const [tracks] = await Promise.all([
        Track.find(trackFilter)
            .select(GENRE_TRACK_SELECT_FIELDS)
            .populate({
                path: "artist_artistId",
                match: publicArtistMatch,
                select: "name avatar coverImage",
            })
            .sort({ releaseDate: -1, createdAt: -1 })
            .lean(),
    ]);

    const publicTracks = tracks.filter((track) => Boolean(track.artist_artistId));
    const totalItems = publicTracks.length;
    const pagedTracks = publicTracks.slice(skip, skip + limit);
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);

    return {
        genre,
        tracks: pagedTracks.map((track) => ({
            ...track,
            versionTitle: track.versionTitle || "",
        })),
        pagination: {
            page,
            limit,
            totalItems,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        },
    };
};

export { getGenreList, getGenreTracksByGenreId };

export default {
    getGenreList,
    getGenreTracksByGenreId,
};
