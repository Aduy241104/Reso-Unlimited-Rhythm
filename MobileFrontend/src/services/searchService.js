import axiosClient from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/apiEndpoints';
import { resolveImageUri } from '../utils/media';

const getPayload = (response) => response?.data || response || {};
const asArray = (value) => (Array.isArray(value) ? value : []);
const asObject = (value) => (value && typeof value === 'object' ? value : {});
const pickFirstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== '');

const normalizeTrackItem = (item, index = 0) => {
  const rawItem = asObject(item);
  const artist = asObject(rawItem?.artist || rawItem?.artist_artistId);

  return {
    ...rawItem,
    id: pickFirstDefined(rawItem.id, rawItem._id, `track-${index}`),
    title: pickFirstDefined(rawItem.title, rawItem.name, 'Bài hát không xác định'),
    artistName: pickFirstDefined(rawItem.artistName, artist?.name, 'Nghệ sĩ không xác định'),
    subtitle: `Bài hát • ${pickFirstDefined(rawItem.artistName, artist?.name, 'Nghệ sĩ không xác định')}`,
    image: pickFirstDefined(
      resolveImageUri(rawItem.coverImage),
      resolveImageUri(rawItem.image),
      resolveImageUri(rawItem.avatar),
      resolveImageUri(artist?.avatar),
      rawItem.coverImage,
      rawItem.image,
      rawItem.avatar,
      ''
    ),
  };
};

const normalizeArtistItem = (item, index = 0) => {
  const rawItem = asObject(item);

  return {
    ...rawItem,
    id: pickFirstDefined(rawItem.id, rawItem._id, `artist-${index}`),
    title: pickFirstDefined(
      rawItem.name,
      rawItem.stageName,
      rawItem.artistName,
      rawItem.displayName,
      'Nghệ sĩ không xác định'
    ),
    subtitle: 'Nghệ sĩ',
    image: pickFirstDefined(
      resolveImageUri(rawItem.avatar),
      resolveImageUri(rawItem.image),
      resolveImageUri(rawItem.coverImage),
      rawItem.avatar,
      rawItem.image,
      rawItem.coverImage,
      ''
    ),
  };
};

const normalizeAlbumItem = (item, index = 0) => {
  const rawItem = asObject(item);
  const artist = asObject(rawItem?.artist || rawItem?.artistId);
  const artistName = pickFirstDefined(rawItem.artistName, artist?.name, 'Nghệ sĩ không xác định');

  return {
    ...rawItem,
    id: pickFirstDefined(rawItem.id, rawItem._id, `album-${index}`),
    title: pickFirstDefined(rawItem.title, rawItem.name, 'Album không xác định'),
    artistName,
    subtitle: `Album • ${artistName}`,
    image: pickFirstDefined(
      resolveImageUri(rawItem.coverImage),
      resolveImageUri(rawItem.image),
      resolveImageUri(artist?.avatar),
      rawItem.coverImage,
      rawItem.image,
      ''
    ),
  };
};

export const searchService = {
  async searchAll(keyword) {
    const response = await axiosClient.get(API_ENDPOINTS.SEARCH.ALL, {
      params: { q: keyword },
    });
    const data = getPayload(response);
    const tracks = asArray(data?.tracks || data?.songs || data?.data?.tracks);
    const artists = asArray(data?.artists || data?.data?.artists);
    const albums = asArray(data?.albums || data?.data?.albums);

    return {
      tracks: tracks.map(normalizeTrackItem),
      artists: artists.map(normalizeArtistItem),
      albums: albums.map(normalizeAlbumItem),
      raw: data,
    };
  },
};

export default searchService;
