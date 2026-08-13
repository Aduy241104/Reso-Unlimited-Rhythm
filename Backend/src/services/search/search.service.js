import Album from "../../models/Album.js";
import Artist from "../../models/Artist.js";
import Track from "../../models/Track.js";
import { publicArtistMatch } from "../artist/artist.status.helper.js";
import {
    buildAlbumsSearchFilter,
    buildArtistsSearchFilter,
    buildPaginationMeta,
    buildSongsSearchFilter,
    isSearchTextMatched,
    normalizePagination,
    normalizeSearchKeyword,
} from "./search.service.helper.js";

const formatSongSearchItem = (song) => ({
    _id: song._id,
    title: song.title,
    versionTitle: song.versionTitle || "",
    avatar: song.avatar,
    coverImage: song.coverImage,
    createdAt: song.createdAt,
});

const hasActiveArtist = (item, artistField) => Boolean(item?.[artistField]);

const formatAlbumSearchItem = (album) => ({
    _id: album._id,
    title: album.title,
    coverImage: album.coverImage,
    createdAt: album.createdAt,
});

const searchSongs = async (query = {}) => {
    const keyword = normalizeSearchKeyword(query.q);
    const filter = buildSongsSearchFilter(keyword);
    const { page, limit, skip } = normalizePagination(query);

    if (!filter) {
        return {
            items: [],
            pagination: buildPaginationMeta(page, limit, 0),
        };
    }

    const songs = await Track.find(filter)
        .select(
            "_id title versionTitle avatar coverImage createdAt artist_artistId"
        )
        .populate({
            path: "artist_artistId",
            match: publicArtistMatch,
            select: "_id",
        })
        .sort({ createdAt: -1 })
        .lean();

    const matchedSongs = songs.filter(
        (song) =>
            hasActiveArtist(song, "artist_artistId") &&
            isSearchTextMatched(song.title, keyword)
    );

    return {
        items: matchedSongs
            .slice(skip, skip + limit)
            .map(formatSongSearchItem),
        pagination: buildPaginationMeta(page, limit, matchedSongs.length),
    };
};

const searchArtists = async (query = {}) => {
    const keyword = normalizeSearchKeyword(query.q);
    const filter = buildArtistsSearchFilter(keyword);
    const { page, limit, skip } = normalizePagination(query);

    if (!filter) {
        return {
            items: [],
            pagination: buildPaginationMeta(page, limit, 0),
        };
    }

    const artists = await Artist.find(filter)
        .select("_id name avatar createdAt")
        .sort({ createdAt: -1 })
        .lean();

    const matchedArtists = artists.filter((artist) =>
        isSearchTextMatched(artist.name, keyword)
    );

    return {
        items: matchedArtists.slice(skip, skip + limit),
        pagination: buildPaginationMeta(page, limit, matchedArtists.length),
    };
};

const searchAlbums = async (query = {}) => {
    const keyword = normalizeSearchKeyword(query.q);
    const filter = buildAlbumsSearchFilter(keyword);
    const { page, limit, skip } = normalizePagination(query);

    if (!filter) {
        return {
            items: [],
            pagination: buildPaginationMeta(page, limit, 0),
        };
    }

    const albums = await Album.find(filter)
        .select("_id title coverImage createdAt artistId")
        .populate({
            path: "artistId",
            match: publicArtistMatch,
            select: "_id",
        })
        .sort({ createdAt: -1 })
        .lean();

    const matchedAlbums = albums.filter(
        (album) =>
            hasActiveArtist(album, "artistId") &&
            isSearchTextMatched(album.title, keyword)
    );

    return {
        items: matchedAlbums
            .slice(skip, skip + limit)
            .map(formatAlbumSearchItem),
        pagination: buildPaginationMeta(page, limit, matchedAlbums.length),
    };
};

const searchAll = async (query = {}) => {
    const keyword = normalizeSearchKeyword(query.q);

    if (!keyword) {
        return {
            songs: [],
            artists: [],
            albums: [],
        };
    }

    const songsFilter = buildSongsSearchFilter(keyword);
    const artistsFilter = buildArtistsSearchFilter(keyword);
    const albumsFilter = buildAlbumsSearchFilter(keyword);

    const [songs, artists, albums] = await Promise.all([
        Track.find(songsFilter)
            .select(
                "_id title versionTitle avatar coverImage createdAt artist_artistId"
            )
            .populate({
                path: "artist_artistId",
                match: publicArtistMatch,
                select: "_id",
            })
            .sort({ createdAt: -1 })
            .lean(),

        Artist.find(artistsFilter)
            .select("_id name avatar createdAt")
            .sort({ createdAt: -1 })
            .lean(),

        Album.find(albumsFilter)
            .select("_id title coverImage createdAt artistId")
            .populate({
                path: "artistId",
                match: publicArtistMatch,
                select: "_id",
            })
            .sort({ createdAt: -1 })
            .lean(),
    ]);

    return {
        songs: songs
            .filter(
                (song) =>
                    hasActiveArtist(song, "artist_artistId") &&
                    isSearchTextMatched(song.title, keyword)
            )
            .slice(0, 6)
            .map(formatSongSearchItem),

        artists: artists
            .filter((artist) =>
                isSearchTextMatched(artist.name, keyword)
            )
            .slice(0, 6),

        albums: albums
            .filter(
                (album) =>
                    hasActiveArtist(album, "artistId") &&
                    isSearchTextMatched(album.title, keyword)
            )
            .slice(0, 6)
            .map(formatAlbumSearchItem),
    };
};

export default {
    searchSongs,
    searchArtists,
    searchAlbums,
    searchAll,
};