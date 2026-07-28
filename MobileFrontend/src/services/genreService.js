import axiosClient from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/apiEndpoints';
import trackService from './trackService';
import { resolveImageUri } from '../utils/media';

const getPayload = (response) => response?.data || response || {};
const asArray = (value) => (Array.isArray(value) ? value : []);
const asObject = (value) => (value && typeof value === 'object' ? value : {});
const pickFirstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== '');

const normalizeGenreItem = (item, index = 0) => {
  const rawItem = asObject(item);
  const coverImage = pickFirstDefined(
    resolveImageUri(rawItem.coverImage),
    resolveImageUri(rawItem.image),
    resolveImageUri(rawItem.thumbnail),
    rawItem.coverImage,
    rawItem.image,
    rawItem.thumbnail,
    ''
  );

  return {
    ...rawItem,
    id: pickFirstDefined(rawItem.id, rawItem._id, rawItem.genreId, `genre-${index}`),
    genreId: pickFirstDefined(rawItem.genreId, rawItem.id, rawItem._id, `genre-${index}`),
    name: pickFirstDefined(rawItem.name, rawItem.title, rawItem.genreName, 'Thể loại'),
    coverImage,
    image: coverImage,
    color: pickFirstDefined(rawItem.color, rawItem.backgroundColor, rawItem.bgColor, ''),
  };
};

const extractGenreItems = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  return asArray(
    payload?.genres ||
      payload?.items ||
      payload?.data?.genres ||
      payload?.data?.items ||
      payload?.data
  );
};

const extractTrackItems = (payload) =>
  asArray(
    payload?.tracks ||
      payload?.items ||
      payload?.data?.tracks ||
      payload?.data?.items ||
      payload?.data
  );

export const genreService = {
  async getGenres(params) {
    try {
      const response = await axiosClient.get(API_ENDPOINTS.GENRES.LIST, { params });
      const payload = getPayload(response);
      const rawItems = extractGenreItems(payload);

      return {
        items: rawItems.map(normalizeGenreItem),
        meta: payload?.pagination || payload?.meta || response?.meta || null,
      };
    } catch (error) {
      console.error('Failed to fetch genres:', error);

      return {
        items: [],
        meta: null,
      };
    }
  },

  async getGenreTracks(genreId, params = {}) {
    try {
      const response = await axiosClient.get(`${API_ENDPOINTS.TRACKS.BY_GENRE}/${genreId}/tracks`, {
        params,
      });
      const payload = getPayload(response);
      const rawItems = extractTrackItems(payload);

      return {
        data: payload,
        tracks: rawItems.map((item, index) => trackService.normalizeTrackItem(item, index)),
        meta: payload?.pagination || payload?.meta || response?.meta || null,
      };
    } catch (error) {
      console.error('Failed to fetch genre tracks:', error);

      return {
        data: null,
        tracks: [],
        meta: null,
      };
    }
  },
};

export default genreService;
