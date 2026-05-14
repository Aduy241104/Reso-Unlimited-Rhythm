import axiosClient from "../axios/axiosClient";

const ARTIST_API_PREFIX = "/api/artists";

export const getMyArtistProfileService = async () => {
  const response = await axiosClient.get(`${ARTIST_API_PREFIX}/me`);
  return response?.data?.data?.artist ?? null;
};
