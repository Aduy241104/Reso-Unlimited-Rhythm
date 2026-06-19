import axiosClient from "../axios/axiosClient";

const USER_GENRE_API_PATH = "/api/browse/genres";

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
    return response.data.data;
  }

  return response?.data;
};

export default {
  getUserGenres,
  getUserGenreTracks,
};
