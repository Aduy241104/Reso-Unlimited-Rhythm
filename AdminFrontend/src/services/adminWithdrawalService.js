import axiosClient from "../axios/axiosClient";

const ADMIN_WITHDRAWAL_API_PREFIX = "/api/admin/withdrawals";

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

export default {
  getAdminWithdrawalRequests,
};
