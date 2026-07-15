import axiosClient from "../axios/axiosClient";

const LIBARY_API_PREFIX = "/api/libary";

export const getFollowedArtists = async (params = {}) => {
  const requestParams = {};

  if (params?.page) {
    requestParams.page = params.page;
  }

  if (params?.limit) {
    requestParams.limit = params.limit;
  }

  const response = await axiosClient.get(`${LIBARY_API_PREFIX}/followed-artists`, {
    params: requestParams,
  });
  const payload = response?.data?.data;

  return {
    artists: Array.isArray(payload?.artists) ? payload.artists : [],
    pagination: payload?.pagination ?? null,
    message: response?.data?.message || "",
  };
};

export const getFollowedAlbums = async (params = {}) => {
  const requestParams = {};

  if (params?.page) {
    requestParams.page = params.page;
  }

  if (params?.limit) {
    requestParams.limit = params.limit;
  }

  const response = await axiosClient.get(`${LIBARY_API_PREFIX}/followed-albums`, {
    params: requestParams,
  });

  return response?.data?.data ?? {
    albums: [],
    pagination: null,
  };
};
