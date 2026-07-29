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

const getFileExtension = (uri = '') => {
  const match = String(uri).match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return match?.[1]?.toLowerCase() || 'jpg';
};

const appendFileField = (formData, field, file) => {
  if (!file?.uri) {
    return;
  }

  const extension = getFileExtension(file.uri);

  formData.append(field, {
    uri: file.uri,
    name: file.name || file.fileName || `upload-${Date.now()}.${extension}`,
    type: file.type || file.mimeType || `image/${extension === 'jpg' ? 'jpeg' : extension}`,
  });
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
    appendFileField(formData, 'coverImage', payload.coverImage);

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
    appendFileField(formData, 'coverImage', payload.coverImage);

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

  async addTrackToMyPlaylist(playlistId, trackId) {
    const response = await axiosClient.post(
      `${API_ENDPOINTS.USER_PLAYLISTS.TRACKS}/${playlistId}/tracks`,
      { trackId }
    );
    const responsePayload = getPayload(response);

    return normalizePlaylistSummary(
      responsePayload?.playlist || responsePayload?.data || responsePayload
    );
  },

  async removeTrackFromMyPlaylist(playlistId, trackId) {
    const response = await axiosClient.delete(
      `${API_ENDPOINTS.USER_PLAYLISTS.TRACKS}/${playlistId}/tracks/${trackId}`
    );

    return getPayload(response);
  },

  async deleteMyPlaylist(playlistId) {
    const response = await axiosClient.delete(`${API_ENDPOINTS.USER_PLAYLISTS.UPDATE}/${playlistId}`);
    return getPayload(response);
  },
};

export default userPlaylistService;
