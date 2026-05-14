import axiosClient from "../axios/axiosClient";

const PLAYLIST_API_PREFIX = "/api/playlists";

export const getSystemPlaylistsService = async (params = {}) => {
  const response = await axiosClient.get(`${PLAYLIST_API_PREFIX}/system`, {
    params,
  });
  return {
    playlists: response?.data?.data?.playlists ?? [],
    pagination: response?.data?.meta ?? null,
  };
};

export const getPlaylistDetailService = async (playlistId) => {
  const response = await axiosClient.get(
    `${PLAYLIST_API_PREFIX}/detail/${playlistId}`
  );
  return response?.data?.data?.playlist ?? null;
};

export const getAdminSystemPlaylistDetailService = async (playlistId) => {
  const response = await axiosClient.get(
    `${PLAYLIST_API_PREFIX}/admin/system/${playlistId}`
  );
  return response?.data?.data?.playlist ?? null;
};

export const updateAdminSystemPlaylistService = async (playlistId, payload) => {
  const response = await axiosClient.patch(
    `${PLAYLIST_API_PREFIX}/admin/system/${playlistId}`,
    payload
  );
  return response?.data?.data?.playlist ?? null;
};

export const deleteAdminSystemPlaylistService = async (playlistId) => {
  const response = await axiosClient.delete(
    `${PLAYLIST_API_PREFIX}/admin/system/${playlistId}`
  );
  return response?.data?.data ?? null;
};

export const createSystemPlaylistService = async (payload) => {
  const response = await axiosClient.post(
    `${PLAYLIST_API_PREFIX}/system`,
    payload
  );
  return response?.data?.data?.playlist ?? null;
};
