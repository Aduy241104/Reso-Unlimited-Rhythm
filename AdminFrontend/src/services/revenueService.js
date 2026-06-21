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
  if (filters.status) params.status = filters.status;
  if (filters.year) params.year = filters.year;
  if (filters.month) params.month = filters.month;

  return params;
};

const normalizeRevenueOverview = (data) => ({
  period: data?.period ?? null,
  summary: data?.summary ?? {},
  lifecycleTimestamps: data?.lifecycleTimestamps ?? {},
  distribution: data?.distribution ?? null,
  availableActions: Array.isArray(data?.availableActions)
    ? data.availableActions
    : [],
  confirmedBy: data?.confirmedBy ?? null,
});

const normalizeRevenueCharts = (data) => ({
  charts: {
    monthly: Array.isArray(data?.charts?.monthly) ? data.charts.monthly : [],
    last14Days: Array.isArray(data?.charts?.last14Days)
      ? data.charts.last14Days
      : [],
  },
  metadata: {
    revenueSharePercent: {
      artist: Number(data?.metadata?.revenueSharePercent?.artist || 0),
      platform: Number(data?.metadata?.revenueSharePercent?.platform || 0),
    },
    lastUpdatedAt: data?.metadata?.lastUpdatedAt ?? null,
  },
});

export const getRevenueDashboardService = async (yearOrParams, month) => {
  const params = normalizeRevenueDashboardParams(yearOrParams, month);

  const res = await axiosClient.get("/api/admin/revenue/dashboard", { params });
  return res.data?.data ?? null;
};

export const getCurrentRevenueOverviewService = async () => {
  try {
    const res = await axiosClient.get("/api/admin/revenue/dashboard");
    return normalizeRevenueOverview(res.data?.data);
  } catch (error) {
    if (error?.response?.status !== 404) {
      throw error;
    }

    const fallbackResponse = await axiosClient.get("/api/admin/revenue/current");
    return normalizeRevenueOverview(fallbackResponse.data?.data);
  }
};

export const getRevenueDashboardChartsService = async () => {
  const res = await axiosClient.get("/api/admin/revenue/dashboard/charts");
  return normalizeRevenueCharts(res.data?.data);
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

export const closeRevenuePeriodService = async (periodId) => {
  const res = await axiosClient.post(`/api/admin/revenue/periods/${periodId}/close`);
  return res.data?.data ?? null;
};

export const calculateRevenueDistributionService = async (periodId) => {
  const res = await axiosClient.post(
    `/api/admin/revenue/periods/${periodId}/calculate`
  );
  return res.data?.data ?? null;
};

export const confirmRevenueDistributionService = async (periodId) => {
  const res = await axiosClient.post(`/api/admin/revenue/periods/${periodId}/confirm`);
  return res.data?.data ?? null;
};

export default {
  getRevenueDashboardService,
  getCurrentRevenueOverviewService,
  getRevenueDashboardChartsService,
  getRevenuePeriodsService,
  getRevenuePeriodDetailService,
  closeRevenuePeriodService,
  calculateRevenueDistributionService,
  confirmRevenueDistributionService,
};
