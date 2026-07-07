import axiosClient from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/apiEndpoints';
import { formatDateLabel, resolveImageUri } from '../utils/media';

const getPayload = (response) => response?.data || response || {};
const asArray = (value) => (Array.isArray(value) ? value : []);
const pickFirstDefined = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');

const normalizeFollowedAlbum = (item) => ({
  id: pickFirstDefined(item?.albumId, item?.id, ''),
  entityId: pickFirstDefined(item?.albumId, item?.id, ''),
  entityType: 'album',
  title: pickFirstDefined(item?.title, 'Album chưa có tên'),
  artistName: pickFirstDefined(item?.artistName, 'Nghệ sĩ không xác định'),
  coverImage: pickFirstDefined(item?.coverImage, ''),
  image: resolveImageUri(item?.coverImage),
  trackCount: Array.isArray(item?.trackList) ? item.trackList.length : 0,
});

const normalizeFollowedArtist = (item, index = 0) => ({
  id: pickFirstDefined(item?.artistId, item?.id, item?._id, `followed-artist-${index}`),
  entityId: pickFirstDefined(item?.artistId, item?.id, item?._id, ''),
  entityType: 'artist',
  name: pickFirstDefined(item?.name, 'Nghệ sĩ không xác định'),
  title: pickFirstDefined(item?.name, 'Nghệ sĩ không xác định'),
  avatar: pickFirstDefined(resolveImageUri(item?.avatar), item?.avatar, ''),
  image: pickFirstDefined(resolveImageUri(item?.avatar), item?.avatar, ''),
  followedAt: pickFirstDefined(item?.followedAt, ''),
  followedAtLabel: formatDateLabel(item?.followedAt),
});

export const libraryService = {
  async getFollowedArtists(params) {
    const response = await axiosClient.get(API_ENDPOINTS.LIBRARY.FOLLOWED_ARTISTS, { params });
    const payload = getPayload(response);
    const rawItems = asArray(payload?.artists || payload?.data?.artists || payload?.data);

    return {
      items: rawItems.map(normalizeFollowedArtist),
      meta: payload?.pagination || payload?.meta || response?.meta || null,
    };
  },

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
