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

const normalizeAlbumItem = (item) => {
  const rawItem = asObject(item);
  const artist = asObject(resolveAlbumArtist(rawItem));
  const trackCount = pickNumber(rawItem.trackCount, asArray(rawItem.trackList).length, asArray(rawItem.tracks).length);

  return {
    ...rawItem,
    id: pickFirstDefined(rawItem.id, rawItem._id, ''),
    title: pickFirstDefined(rawItem.title, 'Untitled album'),
    coverImage: pickFirstDefined(rawItem.coverImage, rawItem.image, ''),
    releaseDate: pickFirstDefined(rawItem.releaseDate, null),
    trackCount,
    totalDuration: pickNumber(rawItem.totalDuration),
    artist: artist?.id || artist?._id || artist?.name
      ? {
          id: pickFirstDefined(artist.id, artist._id, ''),
          name: pickFirstDefined(artist.name, 'Unknown artist'),
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
  const releasedOn = formatDateLabel(normalizedAlbum.releaseDate);
  const updatedOn = formatDateLabel(normalizedAlbum.updatedAt);

  return {
    ...normalizedAlbum,
    type: 'album',
    badgeLabel: 'ALBUM',
    subtitle: artist?.name || 'Album',
    image: resolveImageUri(normalizedAlbum.coverImage),
    description: releasedOn ? `Released ${releasedOn}` : '',
    stats: [
      { label: 'Tracks', value: `${normalizedAlbum.trackCount || tracks.length}` },
      { label: 'Duration', value: formatDuration(normalizedAlbum.totalDuration) },
      { label: 'Released', value: releasedOn || 'Unknown' },
    ],
    meta: [
      { label: 'Artist', value: artist?.name || 'Unknown artist' },
      { label: 'Status', value: pickFirstDefined(rawItem.status, 'active') },
      { label: 'Updated', value: updatedOn || 'Unknown' },
    ],
    tags: [],
    extraTitle: '',
    extraText: '',
    itemsTitle: 'Tracks',
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
};

export default albumService;
