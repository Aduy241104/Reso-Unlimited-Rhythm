import axiosClient from "../axios/axiosClient";

const ALBUM_API_PREFIX = "/api/albums";

const extractAlbumFollowPayload = (response) =>
  response?.data?.data?.follow ||
  response?.data?.follow ||
  response?.data?.data ||
  null;

const normalizeAlbumFollowState = (payload, fallback = {}) => ({
  albumId:
    payload?.albumId ||
    payload?.id ||
    fallback.albumId ||
    null,
  isFollowing:
    typeof payload?.isFollowing === "boolean"
      ? payload.isFollowing
      : typeof fallback.isFollowing === "boolean"
        ? fallback.isFollowing
        : false,
});

export const getAlbumsService = async (params = {}) => {
  const response = await axiosClient.get(ALBUM_API_PREFIX, { params });
  const payload = response?.data?.data;

  return {
    albums: payload?.albums ?? [],
    pagination: response?.data?.pagination ?? null,
  };
};

export const getAlbumDetailService = async (albumId) => {
  const response = await axiosClient.get(`${ALBUM_API_PREFIX}/${albumId}`);
  return response?.data?.data?.album ?? null;
};

export const getAlbumFollowStatusService = async ({ albumId } = {}) => {
  const response = await axiosClient.get(`${ALBUM_API_PREFIX}/${albumId}/follow/status`);

  return normalizeAlbumFollowState(extractAlbumFollowPayload(response), {
    albumId,
    isFollowing: false,
  });
};

export const followAlbumService = async ({ albumId } = {}) => {
  const response = await axiosClient.post(`${ALBUM_API_PREFIX}/${albumId}/follow`);

  return normalizeAlbumFollowState(extractAlbumFollowPayload(response), {
    albumId,
    isFollowing: true,
  });
};

export const unfollowAlbumService = async ({ albumId } = {}) => {
  const response = await axiosClient.delete(`${ALBUM_API_PREFIX}/${albumId}/follow`);

  return normalizeAlbumFollowState(extractAlbumFollowPayload(response), {
    albumId,
    isFollowing: false,
  });
};
