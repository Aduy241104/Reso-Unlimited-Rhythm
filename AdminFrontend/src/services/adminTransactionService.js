import axiosClient from "../axios/axiosClient";

const ADMIN_TRANSACTION_API_PREFIX = "/api/admin/transactions";

export const getAdminTransactionList = async (page = 1, limit = 10) => {
  const response = await axiosClient.get(ADMIN_TRANSACTION_API_PREFIX, {
    params: {
      page,
      limit,
    },
  });

  const data = response?.data?.data ?? {};

  return {
    transactions: Array.isArray(data.transactions) ? data.transactions : [],
    pagination: data.pagination ?? {
      page,
      limit,
      total: 0,
      totalPages: 0,
    },
  };
};

export default {
  getAdminTransactionList,
};
