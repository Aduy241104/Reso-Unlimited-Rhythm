import axiosClient from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/apiEndpoints';
import { normalizePlaylistSummary } from './playlistService';

const getPayload = (response) => response?.data || response || {};
const asArray = (value) => (Array.isArray(value) ? value : []);

const appendStringField = (formData, field, value) => {
  if (typeof value !== 'string') {
    formData.append(field, '');
    return;
  }

  formData.append(field, value.trim());
};

export const userPlaylistService = {
  async getMyPlaylists(params = {}) {
    const requestParams = {};
    const page = Number(params?.page);
    const limit = Number(params?.limit);

    if (Number.isFinite(page) && page > 0) {
      requestParams.page = page;
    }

    if (Number.isFinite(limit) && limit > 0) {
      requestParams.limit = limit;
    }

    const response = await axiosClient.get(API_ENDPOINTS.USER_PLAYLISTS.LIST, {
      params: Object.keys(requestParams).length > 0 ? requestParams : undefined,
    });
    const payload = getPayload(response);
    const rawItems = asArray(payload?.playlists || payload?.items || payload?.data);

    return {
      items: rawItems.map(normalizePlaylistSummary),
      meta: payload?.pagination || payload?.meta || null,
    };
  },

  async createMyPlaylist(payload = {}) {
    const formData = new FormData();

    appendStringField(formData, 'title', payload.title);
    appendStringField(formData, 'description', payload.description);

    const response = await axiosClient.post(
      API_ENDPOINTS.USER_PLAYLISTS.CREATE,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    const responsePayload = getPayload(response);

    return normalizePlaylistSummary(
      responsePayload?.playlist || responsePayload?.data || responsePayload
    );
  },

  async updateMyPlaylist(playlistId, payload = {}) {
    const formData = new FormData();

    appendStringField(formData, 'title', payload.title);
    appendStringField(formData, 'description', payload.description);

    const response = await axiosClient.patch(
      `${API_ENDPOINTS.USER_PLAYLISTS.UPDATE}/${playlistId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    const responsePayload = getPayload(response);

    return normalizePlaylistSummary(
      responsePayload?.playlist || responsePayload?.data || responsePayload
    );
  },

  async deleteMyPlaylist(playlistId) {
    const response = await axiosClient.delete(`${API_ENDPOINTS.USER_PLAYLISTS.UPDATE}/${playlistId}`);
    return getPayload(response);
  },
};

export default userPlaylistService;
