import axiosClient from "../axios/axiosClient";

const SEARCH_API_PREFIX = "/api/search";

const normalizeResponse = (response) => {
  if (response?.data?.data !== undefined) {
    return response.data.data;
  }

  return response?.data;
};

const requestSearch = async (path, params) => {
  const response = await axiosClient.get(path, { params });
  return normalizeResponse(response);
};

const SEARCH_COLLECTION_KEYS = {
  song: ["songs", "tracks", "items"],
  artist: ["artists", "items"],
  album: ["albums", "releases", "items"],
};

const getCandidateContainers = (payload) => {
  if (Array.isArray(payload)) {
    return [payload];
  }

  return [
    payload,
    payload?.data,
    payload?.result,
    payload?.results,
    payload?.searchResults,
    payload?.items,
    payload?.payload,
  ].filter(Boolean);
};

export const normalizeSearchCollection = (payload, type) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  const lookupKeys = SEARCH_COLLECTION_KEYS[type] || [];

  for (const container of getCandidateContainers(payload)) {
    for (const key of lookupKeys) {
      if (Array.isArray(container?.[key])) {
        return container[key];
      }
    }
  }

  return [];
};

export const normalizeSearchAllPayload = (payload) => ({
  songs: normalizeSearchCollection(payload, "song"),
  artists: normalizeSearchCollection(payload, "artist"),
  albums: normalizeSearchCollection(payload, "album"),
});

export const searchAll = async (keyword) =>
  requestSearch(SEARCH_API_PREFIX, {
    q: keyword,
  });

export const searchSongs = async (keyword, page = 1, limit = 10) =>
  requestSearch(`${SEARCH_API_PREFIX}/songs`, {
    q: keyword,
    page,
    limit,
  });

export const searchArtists = async (keyword, page = 1, limit = 10) =>
  requestSearch(`${SEARCH_API_PREFIX}/artists`, {
    q: keyword,
    page,
    limit,
  });

export const searchAlbums = async (keyword, page = 1, limit = 10) =>
  requestSearch(`${SEARCH_API_PREFIX}/albums`, {
    q: keyword,
    page,
    limit,
  });

export default {
  searchAll,
  searchSongs,
  searchArtists,
  searchAlbums,
  normalizeSearchAllPayload,
  normalizeSearchCollection,
};
