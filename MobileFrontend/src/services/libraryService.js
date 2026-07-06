import axiosClient from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/apiEndpoints';
import { resolveImageUri } from '../utils/media';

const getPayload = (response) => response?.data || response || {};
const asArray = (value) => (Array.isArray(value) ? value : []);
const pickFirstDefined = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');

const normalizeFollowedAlbum = (item) => ({
  id: pickFirstDefined(item?.albumId, item?.id, ''),
  entityId: pickFirstDefined(item?.albumId, item?.id, ''),
  entityType: 'album',
  title: pickFirstDefined(item?.title, 'Untitled album'),
  artistName: pickFirstDefined(item?.artistName, 'Unknown artist'),
  coverImage: pickFirstDefined(item?.coverImage, ''),
  image: resolveImageUri(item?.coverImage),
  trackCount: Array.isArray(item?.trackList) ? item.trackList.length : 0,
});

export const libraryService = {
  async getFollowedAlbums(params) {
    const response = await axiosClient.get(API_ENDPOINTS.LIBRARY.FOLLOWED_ALBUMS, { params });
    const payload = getPayload(response);
    const rawItems = asArray(payload?.albums || payload?.data?.albums || payload?.data);

    return {
      items: rawItems.map(normalizeFollowedAlbum),
      meta: payload?.pagination || payload?.meta || response?.meta || null,
    };
  },
};

export default libraryService;
