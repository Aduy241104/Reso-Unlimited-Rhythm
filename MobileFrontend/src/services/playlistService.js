import axiosClient from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/apiEndpoints';

const getPayload = (response) => response?.data || response || {};

export const playlistService = {
  async getSystemPlaylists(params) {
    const response = await axiosClient.get(API_ENDPOINTS.PLAYLISTS.SYSTEM, { params });
    const payload = getPayload(response);

    return {
      items: Array.isArray(payload.playlists) ? payload.playlists : [],
      meta: response?.meta || payload?.meta || null,
    };
  },

  async getPlaylistDetail(playlistId) {
    const endpoints = [
      `${API_ENDPOINTS.PLAYLISTS.SYSTEM_DETAIL}/${playlistId}`,
      `${API_ENDPOINTS.PLAYLISTS.DETAIL}/${playlistId}`,
    ];

    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        const response = await axiosClient.get(endpoint);
        const payload = getPayload(response);

        return payload?.playlist || payload;
      } catch (error) {
        lastError = error;
        const status = error?.response?.status;

        if (status !== 404 && status !== 405) {
          throw error;
        }
      }
    }

    throw lastError;
  },
};

export default playlistService;
