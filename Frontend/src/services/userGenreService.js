import axiosClient from "../axios/axiosClient";

const USER_GENRE_API_PATH = "/api/browse/genres";

export const getUserGenres = async () => {
  const response = await axiosClient.get(USER_GENRE_API_PATH);

  if (response?.data?.data) {
    return response.data.data;
  }

  return response?.data;
};

export default {
  getUserGenres,
};
