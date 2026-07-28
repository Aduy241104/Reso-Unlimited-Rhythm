import axiosClient from "../axios/axiosClient";

const isArtistFollowerPayload = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return (
    Object.prototype.hasOwnProperty.call(value, "artist") ||
    Object.prototype.hasOwnProperty.call(value, "followers") ||
    Object.prototype.hasOwnProperty.call(value, "statistics")
  );
};

const unwrapArtistFollowerPayload = (response) => {
  if (isArtistFollowerPayload(response)) {
    return response;
  }

  const axiosData = response?.data;

  if (isArtistFollowerPayload(axiosData?.data)) {
    return axiosData.data;
  }

  if (isArtistFollowerPayload(axiosData)) {
    return axiosData;
  }

  return {};
};

export const getArtistFollowers = async ({ page = 1, limit = 10 } = {}) => {
  const response = await axiosClient.get("/api/artists/followers", {
    params: {
      page,
      limit,
    },
  });

  return unwrapArtistFollowerPayload(response);
};

export default {
  getArtistFollowers,
};