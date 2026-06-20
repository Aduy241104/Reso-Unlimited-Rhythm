import axiosClient from "../axios/axiosClient";

const USER_FAVORITE_TRACKS_API_PREFIX = "/api/users/favorites/tracks";

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
