import axiosClient from "../axios/axiosClient";

const ADMIN_TRACK_API_PREFIX = "/api/admin/tracks";

export const searchAdminTracksService = async (params = {}) => {
  const response = await axiosClient.get(`${ADMIN_TRACK_API_PREFIX}`, {
    params,
  });

  return {
    tracks: response?.data?.data?.tracks ?? [],
    pagination: response?.data?.meta ?? null,
  };
};

export const getAdminArtistTracksService = async ({
  artistId,
  deletionStatus = "active",
  page = 1,
  limit = 5,
} = {}) => {
  const normalizedArtistId = String(artistId || "");

  if (!normalizedArtistId) {
    return { tracks: [], pagination: null };
  }

  return searchAdminTracksService({
    artistId: normalizedArtistId,
    deletionStatus,
    page,
    limit,
  });
};

export const updateAdminTrackApprovalStatusService = async (
  trackId,
  payload = {}
) => {
  const response = await axiosClient.patch(
    `${ADMIN_TRACK_API_PREFIX}/${trackId}/approval`,
    payload
  );

  return response?.data?.data?.track ?? null;
};

export const getAdminTrackDetailService = async (trackId) => {
  const response = await axiosClient.get(`${ADMIN_TRACK_API_PREFIX}/${trackId}`);
  return response?.data?.data?.track ?? null;
};

export const startAdminTrackReviewSessionService = async (trackId) => {
  const response = await axiosClient.post(`${ADMIN_TRACK_API_PREFIX}/${trackId}/review/session`);
  return response?.data?.data?.review ?? null;
};

export const recordAdminTrackReviewEventService = async (trackId, payload = {}) => {
  const response = await axiosClient.post(`${ADMIN_TRACK_API_PREFIX}/${trackId}/review/events`, payload);
  return response?.data?.data?.review ?? null;
};

export const updateAdminTrackVisibilityService = async (
  trackId,
  payload = {}
) => {
  const response = await axiosClient.patch(
    `${ADMIN_TRACK_API_PREFIX}/${trackId}/visibility`,
    payload
  );

  return response?.data?.data?.track ?? null;
};
