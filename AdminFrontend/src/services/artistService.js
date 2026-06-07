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