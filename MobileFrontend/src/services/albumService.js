import axiosClient from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/apiEndpoints';
import trackService from './trackService';
import {
  formatDateLabel,
  formatDuration,
  resolveImageUri,
} from '../utils/media';

const getPayload = (response) => response?.data || response || {};
const asObject = (value) => (value && typeof value === 'object' ? value : {});
const asArray = (value) => (Array.isArray(value) ? value : []);
const pickFirstDefined = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');
const pickNumber = (...values) => {
  for (const value of values) {
    const parsedValue = Number(value);

    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  return 0;
};

const resolveAlbumArtist = (album) => album?.artist || album?.artistId || {};
const normalizeAlbumFollowState = (value, albumIdFallback = '') => {
  const rawValue = asObject(value);

  return {
    albumId: pickFirstDefined(rawValue.albumId, rawValue.id, albumIdFallback, ''),
    isFollowing: Boolean(rawValue.isFollowing),
  };
};

const normalizeAlbumItem = (item) => {
  const rawItem = asObject(item);
  const artist = asObject(resolveAlbumArtist(rawItem));
  const trackCount = pickNumber(rawItem.trackCount, asArray(rawItem.trackList).length, asArray(rawItem.tracks).length);

  return {
    ...rawItem,
    id: pickFirstDefined(rawItem.id, rawItem._id, ''),
    title: pickFirstDefined(rawItem.title, 'Album chưa có tên'),
    coverImage: pickFirstDefined(rawItem.coverImage, rawItem.image, ''),
    releaseDate: pickFirstDefined(rawItem.releaseDate, null),
    trackCount,
    totalDuration: pickNumber(rawItem.totalDuration),
    artist: artist?.id || artist?._id || artist?.name
      ? {
          id: pickFirstDefined(artist.id, artist._id, ''),
          name: pickFirstDefined(artist.name, 'Nghệ sĩ không xác định'),
          avatar: pickFirstDefined(artist.avatar, ''),
          coverImage: pickFirstDefined(artist.coverImage, ''),
        }
      : null,
    createdAt: pickFirstDefined(rawItem.createdAt, null),
    updatedAt: pickFirstDefined(rawItem.updatedAt, null),
  };
};

const normalizeAlbumTrack = (item, index = 0) => {
  const trackItem = asObject(item);
  const normalizedTrack = trackService.normalizeTrackItem(trackItem.track || trackItem, index);

  return {
    ...normalizedTrack,
    entityType: 'track',
    entityId: pickFirstDefined(normalizedTrack.entityId, normalizedTrack.id, ''),
    meta: formatDuration(normalizedTrack.duration),
  };
};

const normalizeAlbumDetail = (item) => {
  const rawItem = asObject(item);
  const normalizedAlbum = normalizeAlbumItem(rawItem);
  const artist = normalizedAlbum.artist || {};
  const tracks = asArray(rawItem.tracks).map(normalizeAlbumTrack);
  const tracksDuration = tracks.reduce((total, track) => total + Math.max(0, Number(track?.duration) || 0), 0);
  const totalDuration = normalizedAlbum.totalDuration > 0
    ? normalizedAlbum.totalDuration
    : tracksDuration;
  const releasedOn = formatDateLabel(normalizedAlbum.releaseDate);
  const updatedOn = formatDateLabel(normalizedAlbum.updatedAt);

  return {
    ...normalizedAlbum,
    totalDuration,
    type: 'album',
    badgeLabel: 'ALBUM',
    subtitle: artist?.name || 'Album',
    image: resolveImageUri(normalizedAlbum.coverImage),
    description: releasedOn ? `Phát hành ${releasedOn}` : '',
    stats: [
      { label: 'Bài hát', value: `${normalizedAlbum.trackCount || tracks.length}` },
      { label: 'Thời lượng', value: formatDuration(totalDuration) },
      { label: 'Phát hành', value: releasedOn || 'Không xác định' },
    ],
    meta: [
      { label: 'Nghệ sĩ', value: artist?.name || 'Nghệ sĩ không xác định' },
      { label: 'Trạng thái', value: pickFirstDefined(rawItem.status, 'active') },
      { label: 'Cập nhật', value: updatedOn || 'Không xác định' },
    ],
    tags: [],
    extraTitle: '',
    extraText: '',
    itemsTitle: 'Bài hát',
    items: tracks,
  };
};

export const albumService = {
  async getRecentAlbums(params) {
    const response = await axiosClient.get(API_ENDPOINTS.ALBUMS.LIST, { params });
    const payload = getPayload(response);
    const rawItems = asArray(payload.albums || payload.items || payload.data);

    return {
      items: rawItems.map(normalizeAlbumItem),
      meta: response?.meta || payload?.meta || null,
    };
  },

  async getAlbums(params) {
    return this.getRecentAlbums(params);
  },

  async getAlbumDetail(albumId) {
    const response = await axiosClient.get(`${API_ENDPOINTS.ALBUMS.DETAIL}/${albumId}`);
    const payload = getPayload(response);

    return normalizeAlbumDetail(payload?.album || payload?.data || payload);
  },

  async getAlbumFollowStatus(albumId) {
    const response = await axiosClient.get(`${API_ENDPOINTS.ALBUMS.FOLLOW_STATUS}/${albumId}/follow/status`);
    const payload = getPayload(response);

    return normalizeAlbumFollowState(payload?.follow || payload?.data?.follow || payload?.data, albumId);
  },

  async toggleAlbumFollow(albumId) {
    const response = await axiosClient.patch(`${API_ENDPOINTS.ALBUMS.TOGGLE_FOLLOW}/${albumId}/follow/toggle`);
    const payload = getPayload(response);

    return normalizeAlbumFollowState(payload?.follow || payload?.data?.follow || payload?.data, albumId);
  },
};

export default albumService;
