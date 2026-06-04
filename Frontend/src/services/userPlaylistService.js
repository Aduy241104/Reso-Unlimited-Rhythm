import axiosClient from "../axios/axiosClient";

const USER_PLAYLIST_API_PREFIX = "/api/users";

export const getUserPlaylists = async () => {
  const response = await axiosClient.get(`${USER_PLAYLIST_API_PREFIX}/playlists`);

  return response?.data?.data;
};
export const getUserPlaylistDetail = async (playlistId) => {
  const response = await axiosClient.get(
    `${USER_PLAYLIST_API_PREFIX}/playlists/detail/${playlistId}`
  );

  return response?.data?.data?.playlist ?? null;
};