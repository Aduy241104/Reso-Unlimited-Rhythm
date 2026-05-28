import axiosClient from "../axios/axiosClient";

export const getOverviewStatsService = async () => {
    const res = await axiosClient.get("/api/admin/dashboard/overview");
    return res.data?.data?.stats ?? null;
};

export const getMonthlyOverviewService = async (year, month) => {
    const params = {};
    if (year) params.year = year;
    if (month) params.month = month;
    const res = await axiosClient.get("/api/admin/dashboard/monthly", { params });
    return res.data?.data?.stats ?? null;
};

export const getDailyStatsService = async (date) => {
    const params = {};
    if (date) params.date = date;
    const res = await axiosClient.get("/api/admin/dashboard/daily", { params });
    return res.data?.data?.stats ?? null;
};

export default {
    getOverviewStatsService,
    getMonthlyOverviewService,
    getDailyStatsService,
};
