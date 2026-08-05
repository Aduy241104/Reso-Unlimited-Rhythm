import axiosClient from "../axios/axiosClient";

const USER_GENRE_API_PATH = "/api/browse/genres";

const normalizeTrackVersions = (payload) => {
  if (!payload || !Array.isArray(payload.tracks)) {
    return payload;
  }

  return {
    ...payload,
    tracks: payload.tracks.map((track) => ({
      ...track,
      versionTitle: track?.versionTitle || "",
    })),
  };
};

export const getUserGenres = async () => {
  const response = await axiosClient.get(USER_GENRE_API_PATH);

  if (response?.data?.data) {
    return response.data.data;
  }

  return response?.data;
};

export const getUserGenreTracks = async (genreId, page = 1, limit = 20) => {
  const response = await axiosClient.get(
    `${USER_GENRE_API_PATH}/${genreId}/tracks?page=${page}&limit=${limit}`
  );

  if (response?.data?.data) {
    return normalizeTrackVersions(response.data.data);
  }

  return normalizeTrackVersions(response?.data);
};

export default {
  getUserGenres,
  getUserGenreTracks,
};
