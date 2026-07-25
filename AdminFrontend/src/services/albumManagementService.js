import axiosClient from "../axios/axiosClient";

const ADMIN_ALBUM_API_PREFIX = "/api/admin/albums";

export const getAdminAlbumsService = async (params = {}) => {
  const response = await axiosClient.get(ADMIN_ALBUM_API_PREFIX, { params });
  return response?.data;
};

export const getAdminAlbumDetailService = async (albumId) => {
  const response = await axiosClient.get(`${ADMIN_ALBUM_API_PREFIX}/${albumId}`);
  return response?.data;
};

export const updateAdminAlbumStatusService = async (albumId, payload = {}) => {
  const response = await axiosClient.patch(
    `${ADMIN_ALBUM_API_PREFIX}/${albumId}/status`,
    payload
  );

  return response?.data;
};

export default {
  getAdminAlbumsService,
  getAdminAlbumDetailService,
  updateAdminAlbumStatusService,
};
