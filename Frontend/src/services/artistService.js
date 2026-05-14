import axiosClient from "../axios/axiosClient";

const ARTIST_API_PREFIX = "/api/artists";

export const getMyArtistProfileService = async () => {
  const response = await axiosClient.get(`${ARTIST_API_PREFIX}/me`);
  return response?.data?.data?.artist ?? null;
};

export const patchMyArtistProfileService = async (payload) => {
  const response = await axiosClient.patch(`${ARTIST_API_PREFIX}/me`, payload);
  return response?.data?.data?.artist ?? null;
};

export const patchMyArtistProfileMediaService = async (formData) => {
  const response = await axiosClient.patch(
    `${ARTIST_API_PREFIX}/me/media`,
    formData
  );
  return response?.data?.data?.artist ?? null;
};
