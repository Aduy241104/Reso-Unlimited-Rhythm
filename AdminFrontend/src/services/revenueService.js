import axiosClient from "../axios/axiosClient";

const normalizeRevenueDashboardParams = (yearOrParams, month) => {
  const params = {};

  if (typeof yearOrParams === "object" && yearOrParams !== null) {
    if (yearOrParams.year) params.year = yearOrParams.year;
    if (yearOrParams.month) params.month = yearOrParams.month;
    return params;
  }

  if (yearOrParams) params.year = yearOrParams;
  if (month) params.month = month;

  return params;
};

export const getRevenueDashboardService = async (yearOrParams, month) => {
  const params = normalizeRevenueDashboardParams(yearOrParams, month);

  const res = await axiosClient.get("/api/admin/revenue/dashboard", { params });
  return res.data?.data ?? null;
};

export default {
  getRevenueDashboardService,
};
