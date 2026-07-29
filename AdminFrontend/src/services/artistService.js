import axiosClient from "../axios/axiosClient";

const ADMIN_ARTIST_API_PREFIX = "/api/admin/artists";

export const searchAdminArtistsService = async (params = {}) => {
    const response = await axiosClient.get(`${ADMIN_ARTIST_API_PREFIX}`, {
        params,
    });

    return {
        artists: response?.data?.data?.artists ?? [],
        pagination: response?.data?.meta ?? null,
    };
};

export const getAdminArtistDetailService = async (artistId) => {
    const response = await axiosClient.get(`${ADMIN_ARTIST_API_PREFIX}/${artistId}`);
    
    console.log("👇 Cấu trúc Response nhận được từ API chi tiết:", response);

    if (response?.data?.artist) return response.data.artist;
    if (response?.artist) return response.artist;
    if (response?.data) return response.data;
    
    return response;
};

export const updateAdminArtistStatusService = async (artistId, data) => {
    // data gồm: { activeStatus: "blocked" | "active", blockedReason: "..." }
    const response = await axiosClient.patch(`/api/admin/artists/${artistId}/status`, data);
    return response?.data?.data?.artist ?? response?.data ?? response;
};


export default {
    searchAdminArtistsService,
    getAdminArtistDetailService,
    updateAdminArtistStatusService,
};
