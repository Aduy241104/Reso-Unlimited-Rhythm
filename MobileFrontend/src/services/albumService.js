import axiosClient from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/apiEndpoints';

const getPayload = (response) => response?.data || response || {};

export const albumService = {
  async getAlbums(params) {
    const response = await axiosClient.get(API_ENDPOINTS.ALBUMS.LIST, { params });
    const payload = getPayload(response);

    return {
      items: Array.isArray(payload.albums) ? payload.albums : [],
      meta: response?.meta || payload?.meta || null,
    };
  },

  async getAlbumDetail(albumId) {
    const response = await axiosClient.get(`${API_ENDPOINTS.ALBUMS.DETAIL}/${albumId}`);
    const payload = getPayload(response);

    return payload?.album || payload;
  },
};

export default albumService;
