import axiosClient from "../axios/axiosClient";

const ALBUM_API_PREFIX = "/api/albums";

export const getAdminAlbumDetailService = async (albumId) => {
  const response = await axiosClient.get(`${ALBUM_API_PREFIX}/${albumId}`);
  return response?.data?.data?.album ?? null;
};

export default {
  getAdminAlbumDetailService,
};
