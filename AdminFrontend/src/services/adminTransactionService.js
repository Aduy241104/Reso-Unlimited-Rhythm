import axiosClient from "../axios/axiosClient";

const ADMIN_TRANSACTION_API_PREFIX = "/api/admin/transactions";

export const getAdminTransactionList = async (params = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) =>
        value !== undefined &&
        value !== null &&
        value !== ""
    )
  );

  const response = await axiosClient.get(ADMIN_TRANSACTION_API_PREFIX, {
    params: cleanParams,
  });

  const data = response?.data?.data ?? {};
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;

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
