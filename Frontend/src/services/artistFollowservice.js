import axiosClient from "../axios/axiosClient";

export const getArtistFollowers = async ({ page = 1, limit = 10 } = {}) => {
  const response = await axiosClient.get("/api/artists/followers", {
    params: {
      page,
      limit,
    },
  });

  return response?.data?.data || response?.data || {};
};

export default {
  getArtistFollowers,
};
