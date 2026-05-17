import axiosClient from "../axios/axiosClient";

const TRACK_API_PREFIX = "/api/tracks";

export const searchAdminTracksService = async (params = {}) => {
  const response = await axiosClient.get(`${TRACK_API_PREFIX}/admin`, {
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