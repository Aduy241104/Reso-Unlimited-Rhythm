import axiosClient from "../axios/axiosClient";

const USER_FAVORITE_TRACKS_API_PREFIX = "/api/users/favorites/tracks";

const normalizeFavoriteTracksItems = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.tracks)) {
    return payload.tracks;
  }

  if (Array.isArray(payload?.favorites)) {
    return payload.favorites;
  }

  if (Array.isArray(payload?.favoriteTracks)) {
    return payload.favoriteTracks;
  }

  return [];
};

export const addTrackToFavorite = async (trackId) => {
  try {
    const response = await axiosClient.post(
      `${USER_FAVORITE_TRACKS_API_PREFIX}/${trackId}`
    );
    const payload = response?.data?.data ?? response?.data;

    return {
      ...payload,
      isFavorite: Boolean(payload?.isFavorite),
    };
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const removeTrackFromFavorite = async (trackId) => {
  try {
    const response = await axiosClient.delete(
      `${USER_FAVORITE_TRACKS_API_PREFIX}/${trackId}`
    );
    const payload = response?.data?.data ?? response?.data;

    return {
      ...payload,
      isFavorite: Boolean(payload?.isFavorite),
    };
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getTrackFavoriteStatus = async (trackId) => {
  const response = await axiosClient.get(
    `${USER_FAVORITE_TRACKS_API_PREFIX}/${trackId}/status`
  );
  const payload = response?.data?.data ?? response?.data;

  return {
    ...payload,
    isFavorite: Boolean(payload?.isFavorite),
  };
};

export const getFavoriteTracks = async ({ page = 1, limit = 20 } = {}) => {
  try {
    const response = await axiosClient.get(USER_FAVORITE_TRACKS_API_PREFIX, {
      params: {
        page,
        limit,
      },
    });
    const payload = response?.data?.data ?? response?.data;
    const basePayload =
      payload && typeof payload === "object" && !Array.isArray(payload)
        ? payload
        : {};

    return {
      ...basePayload,
      items: normalizeFavoriteTracksItems(payload),
      pagination:
        basePayload?.pagination ??
        basePayload?.meta ??
        response?.data?.pagination ??
        response?.data?.meta ??
        null,
      message: response?.data?.message || basePayload?.message || "",
    };
  } catch (error) {
    throw error.response?.data || error;
  }
};
