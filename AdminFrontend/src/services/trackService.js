import axiosClient from "../axios/axiosClient";

const TRACK_API_PREFIX = "/api/tracks";

export const searchAdminTracksService = async (params = {}) => {
  const response = await axiosClient.get(`${TRACK_API_PREFIX}/admin`, {
    params,
  });
  return {
    tracks: response?.data?.data?.tracks ?? [],
    pagination: response?.data?.meta ?? null,
  };
};
