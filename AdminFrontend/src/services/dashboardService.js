import axiosClient from "../axios/axiosClient";

export const getOverviewStatsService = async (days = 7) => {
    const res = await axiosClient.get("/api/admin/dashboard/stats/overview", {
        params: { days },
    });
    return res.data?.data ?? null;
};

export const getDailyStatsService = async (days = 7) => {
    const res = await axiosClient.get("/api/admin/dashboard/stats/daily", {
        params: { days },
    });
    return res.data?.data?.dailyStats ?? [];
};

export const getTopTracksService = async (limit = 10) => {
    const res = await axiosClient.get("/api/admin/dashboard/stats/top-tracks", {
        params: { limit },
    });
    return res.data?.data?.topTracks ?? [];
};

export const getTopArtistsService = async (limit = 10) => {
    const res = await axiosClient.get("/api/admin/dashboard/stats/top-artists", {
        params: { limit },
    });
    return res.data?.data?.topArtists ?? [];
};

export const getRecentMonthsStatsService = async (months = 6) => {
    const res = await axiosClient.get("/api/admin/dashboard/stats/recent-months", {
        params: { months },
    });
    return res.data?.data?.monthsStats ?? [];
};

export default {
    getOverviewStatsService,
    getDailyStatsService,
    getTopTracksService,
    getTopArtistsService,
    getRecentMonthsStatsService,
};
