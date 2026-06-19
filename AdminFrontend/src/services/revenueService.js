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

const normalizeRevenuePeriodsParams = (filters = {}) => {
  const params = {};

  if (filters.page) params.page = filters.page;
  if (filters.limit) params.limit = filters.limit;

  return params;
};

export const getRevenueDashboardService = async (yearOrParams, month) => {
  const params = normalizeRevenueDashboardParams(yearOrParams, month);

  const res = await axiosClient.get("/api/admin/revenue/dashboard", { params });
  return res.data?.data ?? null;
};

export const getRevenuePeriodsService = async (filters = {}) => {
  const params = normalizeRevenuePeriodsParams(filters);
  const res = await axiosClient.get("/api/admin/revenue/periods", { params });

  return {
    periods: res.data?.data?.revenuePeriods ?? [],
    meta: res.data?.meta ?? null,
  };
};

export const getRevenuePeriodDetailService = async (periodId) => {
  const res = await axiosClient.get(`/api/admin/revenue/periods/${periodId}`);
  return res.data?.data?.revenuePeriod ?? null;
};

export default {
  getRevenueDashboardService,
  getRevenuePeriodsService,
  getRevenuePeriodDetailService,
};
