import axiosClient from "../axios/axiosClient";

export const getRevenueDashboardService = async (year, month) => {
  const params = {};

  if (year) params.year = year;
  if (month) params.month = month;

  const res = await axiosClient.get("/api/admin/revenue/dashboard", { params });
  return res.data?.data ?? null;
};

export default {
  getRevenueDashboardService,
};
