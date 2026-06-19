import axiosClient from "../axios/axiosClient";

export const getPlansService = async (filters = {}) => {
    const params = {};
    if (filters.search) params.q = filters.search;
    if (filters.status) params.status = filters.status;
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;

    const res = await axiosClient.get("/api/admin/subscriptions", { params });
    return {
        plans: res.data?.data?.plans ?? [],
        meta: res.data?.meta ?? {},
    };
};

export const getPlanDetailService = async (id) => {
    const res = await axiosClient.get(`/api/admin/subscriptions/${id}`);
    return {
        plan: res.data?.data?.plan ?? null,
        subscriptionStats: res.data?.data?.subscriptionStats ?? {},
    };
};

export const createPlanService = async (data) => {
    const res = await axiosClient.post("/api/admin/subscriptions", data);
    return res.data?.data?.plan ?? res.data;
};

export const updatePlanService = async (id, data) => {
    const res = await axiosClient.patch(`/api/admin/subscriptions/${id}`, data);
    return res.data?.data?.plan ?? res.data;
};

export const deletePlanService = async (id) => {
    const res = await axiosClient.delete(`/api/admin/subscriptions/${id}`);
    return res.data?.data?.plan ?? res.data;
};

export const getSubscriptionStatsService = async (filters = {}) => {
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.planId) params.planId = filters.planId;

    const res = await axiosClient.get("/api/admin/subscriptions/stats", { params });
    return res.data?.data?.stats ?? {};
};

export default {
    getPlansService,
    getPlanDetailService,
    createPlanService,
    updatePlanService,
    deletePlanService,
    getSubscriptionStatsService,
};
