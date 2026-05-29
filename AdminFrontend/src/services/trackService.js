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

export const updateAdminTrackApprovalStatusService = async (
  trackId,
  payload = {}
) => {
  const response = await axiosClient.patch(
    `${TRACK_API_PREFIX}/admin/${trackId}/approval`,
    payload
  );

  return response?.data?.data?.track ?? null;
};

export const updateAdminTrackVisibilityService = async (
  trackId,
  payload = {}
) => {
  const response = await axiosClient.patch(
    `${TRACK_API_PREFIX}/admin/${trackId}/visibility`,
    payload
  );

  return response?.data?.data?.track ?? null;
};
