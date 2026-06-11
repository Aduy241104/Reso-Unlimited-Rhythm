import axiosClient from "../axios/axiosClient";

export const getTransactionsService = async (filters = {}) => {
    const params = {};
    if (filters.search) params.q = filters.search; // Tìm theo mã giao dịch hoặc email
    if (filters.status) params.status = filters.status;
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;

    const res = await axiosClient.get("/api/admin/transactions", { params });
    return res.data?.data?.transactions ?? [];
};

export default { getTransactionsService };