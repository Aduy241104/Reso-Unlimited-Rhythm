import axiosClient from "../axios/axiosClient";

const ARTIST_API_PREFIX = "/api/artists";

export const getMyArtistProfileService = async () => {
  const response = await axiosClient.get(`${ARTIST_API_PREFIX}/me`);
  return response?.data?.data?.artist ?? null;
};

export const getMyArtistBlockStatusService = async () => {
  const response = await axiosClient.get(`${ARTIST_API_PREFIX}/me/block-status`);
  return response?.data?.data?.blockStatus ?? null;
};

export const getMyArtistRevenueSummaryService = async () => {
  const response = await axiosClient.get(`${ARTIST_API_PREFIX}/me/revenue-summary`);
  return response?.data?.data?.revenue ?? null;
};

export const createMyArtistWithdrawalRequestService = async (payload) => {
  const response = await axiosClient.post(
    `${ARTIST_API_PREFIX}/me/withdrawal-requests`,
    payload
  );

  return response?.data?.data?.withdrawalRequest ?? null;
};

export const createMyArtistPayoutAccountService = async (payload) => {
  const response = await axiosClient.post(
    `${ARTIST_API_PREFIX}/me/payout-accounts`,
    payload
  );

  return response?.data?.data ?? null;
};

export const getMyArtistWithdrawalRequestsService = async (params = {}) => {
  const response = await axiosClient.get(
    `${ARTIST_API_PREFIX}/me/withdrawal-requests`,
    { params }
  );

  return {
    items: response?.data?.data?.withdrawalRequests ?? [],
    meta: response?.data?.meta ?? null,
  };
};

export const getArtistPerformanceOverviewService = async (params = {}) => {
  const response = await axiosClient.get("/api/artist/overview/performance", {
    params,
  });

  return response?.data?.data ?? null;
};

export const postArtistVerificationRequestService = async (payload = {}) => {
  const response = await axiosClient.post(
    `${ARTIST_API_PREFIX}/me/verification-request`,
    payload
  );
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
