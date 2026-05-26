import axiosClient from "../../axios/axiosClient";

const ARTIST_ALBUM_API_PREFIX = "/api/artists/albums";

export const getArtistAlbumsService = async (params = {}) => {
  const response = await axiosClient.get(ARTIST_ALBUM_API_PREFIX, { params });
  const payload = response?.data?.data;

  return {
    albums: payload?.albums ?? [],
    pagination: response?.data?.pagination ?? null,
  };
};

export const getArtistAlbumDetailService = async (albumId) => {
  const response = await axiosClient.get(`${ARTIST_ALBUM_API_PREFIX}/${albumId}`);
  return response?.data?.data?.album ?? null;
};

export const createAlbumService = async (payload) => {
  const response = await axiosClient.post(ARTIST_ALBUM_API_PREFIX, payload, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response?.data?.data?.album ?? null;
};

export const editAlbumService = async (albumId, payload) => {
  const response = await axiosClient.patch(`${ARTIST_ALBUM_API_PREFIX}/${albumId}`, payload, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response?.data?.data?.album ?? null;
};

export const hideAlbumService = async (albumId) => {
  const response = await axiosClient.patch(`${ARTIST_ALBUM_API_PREFIX}/${albumId}/hide`);
  return response?.data?.data?.album ?? null;
};

export const unhideAlbumService = async (albumId) => {
  const response = await axiosClient.patch(`${ARTIST_ALBUM_API_PREFIX}/${albumId}/unhide`);
  return response?.data?.data?.album ?? null;
};
