import axiosClient from "../axios/axiosClient";

const TRACK_API_PREFIX = "/api/tracks";

export const getTrackDetailService = async (trackId) => {
  const response = await axiosClient.get(`${TRACK_API_PREFIX}/${trackId}`);
  const payload = response?.data?.data;

  return payload?.track || response?.data?.track || payload || null;
};
