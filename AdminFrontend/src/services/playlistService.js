import axiosClient from "../axios/axiosClient";

const PLAYLIST_API_PREFIX = "/api/playlists";

export const createSystemPlaylistService = async (payload) => {
  const response = await axiosClient.post(
    `${PLAYLIST_API_PREFIX}/system`,
    payload
  );
  return response?.data?.data?.playlist ?? null;
};
