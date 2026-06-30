import axiosClient from "../axios/axiosClient";

export const getArtistFollowers = async ({ page = 1, limit = 10 } = {}) => {
  const response = await axiosClient.get("/api/artists/followers", {
    params: {
      page,
      limit,
    },
  });

  const items = response?.data?.data?.items || [];
  const pagination = response?.data?.data?.pagination || {};

  return {
    items,
    pagination: {
      page: Number(pagination.page || page),
      limit: Number(pagination.limit || limit),
      totalItems: Number(pagination.totalItems || 0),
      totalPages: Number(pagination.totalPages || 0),
    },
  };
};

export default {
  getArtistFollowers,
};