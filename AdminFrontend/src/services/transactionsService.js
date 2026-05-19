import axiosClient from "../axios/axiosClient";


/**
 * Admin lấy transaction của một user
 */
export const getTransactionsByUserIdService = async (userId) => {
    const res = await axiosClient.get(`/api/transactions/user/${userId}`);
    return res.data?.data?.transactions ?? [];
};

export default {
    getTransactionsByUserIdService,
};