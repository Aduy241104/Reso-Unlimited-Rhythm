import axiosClient from "../axios/axiosClient";

const ADMIN_ARTIST_REQUEST_API_PREFIX = "/api/admin/artist-requests";

export const getArtistRequestsService = async (params = {}) => {
  const response = await axiosClient.get(ADMIN_ARTIST_REQUEST_API_PREFIX, {
    params,
  });

  return {
    artistRequests: response?.data?.data?.artistRequests ?? [],
    pagination: response?.data?.meta ?? null,
  };
};

export const getArtistRequestDetailService = async (requestId) => {
  const response = await axiosClient.get(
    `${ADMIN_ARTIST_REQUEST_API_PREFIX}/${requestId}`
  );

  return response?.data?.data?.artistRequest ?? null;
};

export const reviewArtistRequestService = async (
  requestId,
  payload = {}
) => {
  const response = await axiosClient.patch(
    `${ADMIN_ARTIST_REQUEST_API_PREFIX}/${requestId}/decision`,
    payload
  );

  return {
    artistRequest: response?.data?.data?.artistRequest ?? null,
    artist: response?.data?.data?.artist ?? null,
  };
};

export default {
  getArtistRequestsService,
  getArtistRequestDetailService,
  reviewArtistRequestService,
};
