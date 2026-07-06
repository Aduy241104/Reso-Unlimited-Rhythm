import axiosClient from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/apiEndpoints';
import { formatDateLabel, formatDuration, resolveImageUri } from '../utils/media';
import { resolveTrackAudioUri } from '../utils/player';

const getPayload = (response) => response?.data || response || {};
const asArray = (value) => (Array.isArray(value) ? value : []);
const pickFirstDefined = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');

const normalizeFavoriteTrack = (item, index = 0) => ({
  ...item,
  id: pickFirstDefined(item?.id, item?._id, `favorite-track-${index}`),
  entityId: pickFirstDefined(item?.id, item?._id, ''),
  entityType: 'track',
  title: pickFirstDefined(item?.title, 'Bài hát không xác định'),
  subtitle: pickFirstDefined(item?.artist?.name, 'Nghệ sĩ không xác định'),
  artistName: pickFirstDefined(item?.artist?.name, 'Nghệ sĩ không xác định'),
  image: pickFirstDefined(
    resolveImageUri(item?.avatar),
    resolveImageUri(item?.coverImage),
    resolveImageUri(item?.image),
    ''
  ),
  duration: Number(item?.duration) || 0,
  audioUri: pickFirstDefined(item?.audioUri, resolveTrackAudioUri(item), ''),
  meta: Number(item?.duration) > 0 ? formatDuration(item.duration) : '',
  favoritedAtLabel: formatDateLabel(item?.favoritedAt),
});

export const userFavoriteService = {
  async getFavoriteTracks(params = {}) {
    const requestParams = {};
    const page = Number(params?.page);
    const limit = Number(params?.limit);

    if (Number.isFinite(page) && page > 0) {
      requestParams.page = page;
    }

    if (Number.isFinite(limit) && limit > 0) {
      requestParams.limit = limit;
    }

    const response = await axiosClient.get(API_ENDPOINTS.USER_FAVORITES.TRACKS, {
      params: Object.keys(requestParams).length > 0 ? requestParams : undefined,
    });
    const payload = getPayload(response);
    const rawItems = asArray(payload?.items || payload?.tracks || payload?.data);

    return {
      items: rawItems.map(normalizeFavoriteTrack),
      meta: payload?.pagination || payload?.meta || null,
    };
  },
};

export default userFavoriteService;
