import axiosClient from "../axios/axiosClient";

const artistRevenueService = {
    async getLatestRevenue() {
        const response = await axiosClient.get("/api/artist/revenue/latest");
        return response.data?.data;
    },

    async getRevenuePeriods({ page = 1, limit = 20 } = {}) {
        const response = await axiosClient.get("/api/artist/revenue/periods", {
            params: {
                page,
                limit,
            },
        });

        return {
            revenuePeriods: response.data?.data?.revenuePeriods || [],
            meta: response.data?.meta || {
                page,
                limit,
                total: 0,
                totalPages: 1,
            },
        };
    },

    async getRevenuePeriodDetail(id) {
        const response = await axiosClient.get(`/api/artist/revenue/periods/${id}`);
        return response.data?.data;
    },
};

export default artistRevenueService;