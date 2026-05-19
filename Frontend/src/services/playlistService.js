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
    `${PLAYLIST_API_PREFIX}/system/detail/${playlistId}`
  );

  return response?.data?.data?.playlist ?? null;
};
