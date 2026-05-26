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
