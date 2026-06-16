import axiosClient from "../axios/axiosClient";

export const getReportsService = async (filters = {}) => {
    const params = {};
    if (filters.search) params.q = filters.search;
    if (filters.status) params.status = filters.status;
    if (filters.targetType) params.targetType = filters.targetType;
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;

    const res = await axiosClient.get("/api/admin/reports", { params });
    return {
        reports: res.data?.data?.reports ?? [],
        meta: res.data?.meta ?? {},
    };
};

export const getReportDetailService = async (id) => {
    const res = await axiosClient.get(`/api/admin/reports/${id}`);
    return res.data?.data?.report ?? null;
};

export const updateReportStatusService = async (id, data) => {
    const res = await axiosClient.patch(`/api/admin/reports/${id}/status`, data);
    return res.data?.data?.report ?? res.data;
};

export default {
    getReportsService,
    getReportDetailService,
    updateReportStatusService,
};
