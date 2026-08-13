import Album from "../../models/Album.js";
import Artist from "../../models/Artist.js";
import Track from "../../models/Track.js";
import Podcast from "../../models/Podcast.js";
import Playlist from "../../models/Playlist.js";
import { publicArtistMatch } from "../artist/artist.status.helper.js";
import { normalizePodcast } from "../podcast/podcast.service.js";
import {
    buildAlbumsSearchFilter,
    buildArtistsSearchFilter,
    buildPaginationMeta,
    buildPodcastsSearchFilter,
    buildPlaylistsSearchFilter,
    buildSongsSearchFilter,
    normalizePagination,
    normalizeSearchKeyword,
    scoreSearchMatch,
} from "./search.service.helper.js";

const SEARCH_RESULT_LIMIT = 8;

const formatSongSearchItem = (song) => ({
    ...song,
    id: song._id?.toString?.() || song.id,
    versionTitle: song.versionTitle || "",
    artist: song.artist_artistId
        ? {
            id: song.artist_artistId._id?.toString?.() || song.artist_artistId.id,
            name: song.artist_artistId.name || "",
            avatar: song.artist_artistId.avatar || "",
        }
        : null,
});

const formatAlbumSearchItem = (album) => ({
    ...album,
    id: album._id?.toString?.() || album.id,
});

const getPrimaryScore = (item, keyword, type) => {
    if (type === "artist") {
        return scoreSearchMatch(item?.name, keyword);
    }

    return scoreSearchMatch(item?.title, keyword);
};

const getCreatorOrArtist = (item, type) => {
    if (type === "song") {
        return item?.artist_artistId?.name;
    }

    if (type === "podcast") {
        return item?.creator?.name;
    }

    if (type === "album") {
        return item?.artistId?.name;
    }

    return "";
};

const getSecondaryScore = (item, keyword, type) => {
    const creatorOrArtist = getCreatorOrArtist(item, type);
    const secondaryScore = scoreSearchMatch(creatorOrArtist, keyword);

    if (secondaryScore < 0) {
        return -1;
    }

    // Keep artist/creator matches below every useful title/name match, while
    // still allowing them as a final content fallback.
    return secondaryScore >= 70 ? 40 : 10;
};

const rankItems = (items, keyword, type) =>
    items
        .map((item) => {
            const primaryScore = getPrimaryScore(item, keyword, type);

            if (primaryScore >= 70 || type === "artist" || type === "playlist") {
                return { item, score: primaryScore };
            }

            const secondaryScore = getSecondaryScore(item, keyword, type);

            return {
                item,
                score: Math.max(primaryScore, secondaryScore),
            };
        })
        .filter(({ score }) => score >= 0)
        .sort((left, right) => {
            if (right.score !== left.score) {
                return right.score - left.score;
            }

            const rightDate = new Date(right.item.updatedAt || right.item.createdAt || 0).getTime();
            const leftDate = new Date(left.item.updatedAt || left.item.createdAt || 0).getTime();
            return rightDate - leftDate;
        });

const getCandidateArtists = async (keyword) => {
    if (!keyword) {
        return [];
    }

    return Artist.find(buildArtistsSearchFilter(keyword))
        .select("_id name avatar createdAt updatedAt")
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(100)
        .lean();
};

const getRankedCollections = async (keyword) => {
    const candidateArtists = await getCandidateArtists(keyword);
    const candidateArtistIds = candidateArtists.map((artist) => artist._id);

    const [songs, artists, albums, podcasts, playlists] = await Promise.all([
        Track.find(buildSongsSearchFilter(keyword, candidateArtistIds))
            .select("_id title versionTitle avatar coverImage createdAt updatedAt artist_artistId stats duration")
            .populate({
                path: "artist_artistId",
                match: publicArtistMatch,
                select: "_id name avatar",
            })
            .sort({ updatedAt: -1, createdAt: -1 })
            .limit(120)
            .lean(),
        Artist.find(buildArtistsSearchFilter(keyword))
            .select("_id name avatar createdAt updatedAt")
            .sort({ updatedAt: -1, createdAt: -1 })
            .limit(120)
            .lean(),
        Album.find(buildAlbumsSearchFilter(keyword, candidateArtistIds))
            .select("_id title coverImage createdAt updatedAt artistId")
            .populate({
                path: "artistId",
                match: publicArtistMatch,
                select: "_id name avatar",
            })
            .sort({ updatedAt: -1, createdAt: -1 })
            .limit(120)
            .lean(),
        Podcast.find(buildPodcastsSearchFilter(keyword, candidateArtistIds))
            .populate({ path: "creator", match: publicArtistMatch, select: "_id name avatar" })
            .sort({ updatedAt: -1, createdAt: -1 })
            .limit(120)
            .lean(),
        Playlist.find(buildPlaylistsSearchFilter(keyword))
            .select("_id title coverImage createdAt updatedAt type")
            .sort({ updatedAt: -1, createdAt: -1 })
            .limit(120)
            .lean(),
    ]);

    const rankedSongs = rankItems(
        songs.filter((song) => song.artist_artistId),
        keyword,
        "song"
    );
    const rankedArtists = rankItems(artists, keyword, "artist");
    const rankedAlbums = rankItems(
        albums.filter((album) => album.artistId),
        keyword,
        "album"
    );
    const rankedPodcasts = rankItems(
        podcasts.filter((podcast) => podcast.creator),
        keyword,
        "podcast"
    );
    const rankedPlaylists = rankItems(playlists, keyword, "playlist");

    return {
        songs: rankedSongs.map(({ item, score }) => ({
            ...formatSongSearchItem(item),
            searchScore: score,
        })),
        artists: rankedArtists.map(({ item, score }) => ({ ...item, searchScore: score })),
        albums: rankedAlbums.map(({ item, score }) => ({
            ...formatAlbumSearchItem(item),
            searchScore: score,
        })),
        podcasts: rankedPodcasts.map(({ item, score }) => ({
            ...normalizePodcast(item),
            searchScore: score,
        })),
        playlists: rankedPlaylists.map(({ item, score }) => ({
            ...item,
            id: item._id?.toString?.() || item.id,
            searchScore: score,
        })),
    };
};

const searchSongs = async (query = {}) => {
    const keyword = normalizeSearchKeyword(query.q);
    const { page, limit, skip } = normalizePagination(query);

    if (!keyword) {
        return { items: [], pagination: buildPaginationMeta(page, limit, 0) };
    }

    const collections = await getRankedCollections(keyword);
    const items = collections.songs.slice(skip, skip + limit);

    return {
        items,
        pagination: buildPaginationMeta(page, limit, collections.songs.length),
    };
};

const searchArtists = async (query = {}) => {
    const keyword = normalizeSearchKeyword(query.q);
    const { page, limit, skip } = normalizePagination(query);

    if (!keyword) {
        return { items: [], pagination: buildPaginationMeta(page, limit, 0) };
    }

    const collections = await getRankedCollections(keyword);

    return {
        items: collections.artists.slice(skip, skip + limit),
        pagination: buildPaginationMeta(page, limit, collections.artists.length),
    };
};

const searchAlbums = async (query = {}) => {
    const keyword = normalizeSearchKeyword(query.q);
    const { page, limit, skip } = normalizePagination(query);

    if (!keyword) {
        return { items: [], pagination: buildPaginationMeta(page, limit, 0) };
    }

    const collections = await getRankedCollections(keyword);

    return {
        items: collections.albums.slice(skip, skip + limit),
        pagination: buildPaginationMeta(page, limit, collections.albums.length),
    };
};

const searchPodcasts = async (query = {}) => {
    const keyword = normalizeSearchKeyword(query.q);
    const { page, limit, skip } = normalizePagination(query);

    if (!keyword) {
        return { items: [], pagination: buildPaginationMeta(page, limit, 0) };
    }

    const collections = await getRankedCollections(keyword);

    return {
        items: collections.podcasts.slice(skip, skip + limit),
        pagination: buildPaginationMeta(page, limit, collections.podcasts.length),
    };
};

const searchPlaylists = async (query = {}) => {
    const keyword = normalizeSearchKeyword(query.q);
    const { page, limit, skip } = normalizePagination(query);

    if (!keyword) {
        return { items: [], pagination: buildPaginationMeta(page, limit, 0) };
    }

    const collections = await getRankedCollections(keyword);

    return {
        items: collections.playlists.slice(skip, skip + limit),
        pagination: buildPaginationMeta(page, limit, collections.playlists.length),
    };
};

const searchAll = async (query = {}) => {
    const keyword = normalizeSearchKeyword(query.q);

    if (!keyword) {
        return {
            songs: [],
            artists: [],
            albums: [],
            podcasts: [],
            playlists: [],
        };
    }

    const collections = await getRankedCollections(keyword);

    return {
        songs: collections.songs.slice(0, SEARCH_RESULT_LIMIT),
        artists: collections.artists.slice(0, SEARCH_RESULT_LIMIT),
        albums: collections.albums.slice(0, SEARCH_RESULT_LIMIT),
        podcasts: collections.podcasts.slice(0, SEARCH_RESULT_LIMIT),
        playlists: collections.playlists.slice(0, SEARCH_RESULT_LIMIT),
    };
};

export { rankItems };

export default {
    searchSongs,
    searchArtists,
    searchAlbums,
    searchPodcasts,
    searchPlaylists,
    searchAll,
};
