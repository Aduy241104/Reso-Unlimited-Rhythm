import axiosClient from "../axios/axiosClient";

const ALBUM_API_PREFIX = "/api/albums";

export const getAlbumsService = async (params = {}) => {
  const response = await axiosClient.get(ALBUM_API_PREFIX, { params });
  const payload = response?.data?.data;

  return {
    albums: payload?.albums ?? [],
    pagination: response?.data?.pagination ?? null,
  };
};

export const getAlbumDetailService = async (albumId) => {
  const response = await axiosClient.get(`${ALBUM_API_PREFIX}/${albumId}`);
  return response?.data?.data?.album ?? null;
};
