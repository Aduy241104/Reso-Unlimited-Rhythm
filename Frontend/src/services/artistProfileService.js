import axiosClient from "../axios/axiosClient";

const ARTIST_PROFILE_PREFIX = "/api/artist/profile";

export const getArtistProfileService = async () => {
  const response = await axiosClient.get(ARTIST_PROFILE_PREFIX);
  return response?.data?.data ?? null;
};

export const patchArtistProfileService = async (payload) => {
  const response = await axiosClient.patch(ARTIST_PROFILE_PREFIX, payload);
  return response?.data?.data ?? null;
};

export const requestArtistVerificationService = async () => {
  const response = await axiosClient.post(
    `${ARTIST_PROFILE_PREFIX}/verification-request`
  );
  return response?.data?.data ?? null;
};

export const uploadArtistAvatarService = async (formData) => {
  return axiosClient.post(`${ARTIST_PROFILE_PREFIX}/media/avatar`, formData);
};

export const uploadArtistCoverService = async (formData) => {
  return axiosClient.post(`${ARTIST_PROFILE_PREFIX}/media/cover`, formData);
};
