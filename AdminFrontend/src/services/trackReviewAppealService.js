import axiosClient from "../axios/axiosClient";

const API_PREFIX = "/api/admin/track-appeals";

export const listTrackReviewAppealsService = async (params = {}) => {
  const response = await axiosClient.get(API_PREFIX, { params });
  return {
    appeals: response?.data?.data?.appeals || [],
    pagination: response?.data?.meta || null,
  };
};

export const getTrackReviewAppealService = async (appealId) => {
  const response = await axiosClient.get(`${API_PREFIX}/${appealId}`);
  return response?.data?.data?.appeal || null;
};

export const acceptTrackReviewAppealService = async (appealId, adminResponse = "") => {
  const response = await axiosClient.post(`${API_PREFIX}/${appealId}/accept`, { adminResponse });
  return response?.data?.data?.appeal || null;
};

export const rejectTrackReviewAppealService = async (appealId, adminResponse) => {
  const response = await axiosClient.post(`${API_PREFIX}/${appealId}/reject`, { adminResponse });
  return response?.data?.data?.appeal || null;
};
