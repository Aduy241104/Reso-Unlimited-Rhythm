import axiosClient from "../axios/axiosClient";

const GENRES_API_PREFIX = "/api/genres";

export const getGenresService = async () => {
  const response = await axiosClient.get(GENRES_API_PREFIX);
  const payload = response?.data?.data;

  return payload?.genres ?? [];
};

export default {
  getGenresService,
};
