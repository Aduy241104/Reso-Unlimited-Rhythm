import axiosClient from "../axios/axiosClient";

const ADMIN_WITHDRAWAL_API_PREFIX = "/api/admin/withdrawals";
const ADMIN_WITHDRAWAL_REQUEST_API_PREFIX = "/api/admin/withdrawal-requests";

export const getAdminWithdrawalRequests = async (params = {}) => {
  const response = await axiosClient.get(ADMIN_WITHDRAWAL_API_PREFIX, {
    params,
  });

  const data = response?.data?.data ?? {};

  return {
    withdrawals: data.withdrawals ?? [],
    pagination: data.pagination ?? response?.data?.meta ?? null,
  };
};

export const approveWithdrawalRequestService = async (id) => {
  const response = await axiosClient.patch(
    `${ADMIN_WITHDRAWAL_REQUEST_API_PREFIX}/${id}/approve`
  );

  return response?.data?.data?.withdrawalRequest ?? null;
};

export const rejectWithdrawalRequestService = async (id, payload = {}) => {
  const response = await axiosClient.patch(
    `${ADMIN_WITHDRAWAL_REQUEST_API_PREFIX}/${id}/reject`,
    payload
  );

  return response?.data?.data?.withdrawalRequest ?? null;
};

export const getWithdrawalRequestDetailService = async (id) => {
  const response = await axiosClient.get(
    `${ADMIN_WITHDRAWAL_REQUEST_API_PREFIX}/${id}`
  );

  return response?.data?.data?.withdrawalRequest ?? null;
};

export default {
  getAdminWithdrawalRequests,
  approveWithdrawalRequestService,
  rejectWithdrawalRequestService,
  getWithdrawalRequestDetailService,
};
