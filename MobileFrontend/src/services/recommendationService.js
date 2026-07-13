import axiosClient from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/apiEndpoints';
import { resolveImageUri } from '../utils/media';
import { resolveTrackAudioUri } from '../utils/player';

const getPayload = (response) => response?.data || response || {};
const asObject = (value) => (value && typeof value === 'object' ? value : {});
const asArray = (value) => (Array.isArray(value) ? value : []);
const pickFirstDefined = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');

const readText = (value) => (typeof value === 'string' ? value.trim() : '');

const formatBasedOnLabel = (basedOn = {}) => {
  const artistNames = asArray(basedOn?.artists)
    .map((artist) => readText(artist?.name))
    .filter(Boolean)
    .slice(0, 2);

  if (artistNames.length > 0) {
    return `Nghe nhieu ${artistNames.join(', ')}`;
  }

  const genreNames = asArray(basedOn?.genres)
    .map((genre) => readText(genre?.name))
    .filter(Boolean)
    .slice(0, 2);

  if (genreNames.length > 0) {
    return `Hop gu ${genreNames.join(', ')}`;
  }

  return '';
};

const normalizeMixTrack = (item, index = 0) => {
  const rawItem = asObject(item);
  const artist = asObject(rawItem.artist);
  const image = pickFirstDefined(
    resolveImageUri(rawItem.coverImage),
    resolveImageUri(rawItem.avatar),
    ''
  );

  return {
    ...rawItem,
    id: pickFirstDefined(rawItem.id, rawItem._id, `daily-mix-track-${index}`),
    entityId: pickFirstDefined(rawItem.id, rawItem._id, ''),
    entityType: 'track',
    title: pickFirstDefined(readText(rawItem.title), 'Bai hat chua co ten'),
    subtitle: pickFirstDefined(readText(artist.name), 'Nghe si khong xac dinh'),
    artist: {
      ...artist,
      id: pickFirstDefined(artist.id, artist._id, ''),
    },
    artistId: pickFirstDefined(artist.id, artist._id, ''),
    artistName: pickFirstDefined(readText(artist.name), 'Nghe si khong xac dinh'),
    image,
    coverImage: image,
    avatar: image,
    duration: Math.max(0, Number(rawItem.duration) || 0),
    audioUri: pickFirstDefined(rawItem.audioUri, resolveTrackAudioUri(rawItem), ''),
  };
};

const normalizeDailyMix = (item, index = 0) => {
  const rawItem = asObject(item);
  const tracks = asArray(rawItem.tracks).map(normalizeMixTrack).filter((track) => Boolean(track.id));
  const coverImage = pickFirstDefined(
    resolveImageUri(rawItem.coverImage),
    resolveImageUri(rawItem.image),
    tracks[0]?.coverImage,
    tracks[0]?.image,
    ''
  );
  const basedOnLabel = formatBasedOnLabel(rawItem.basedOn);

  return {
    ...rawItem,
    id: pickFirstDefined(rawItem.id, rawItem._id, `daily-mix-${index}`),
    title: pickFirstDefined(readText(rawItem.title), `Daily Mix ${index + 1}`),
    description: readText(rawItem.description),
    image: coverImage,
    coverImage,
    tracks,
    trackCount: tracks.length,
    basedOnLabel,
    subtitle: tracks.length > 0 ? `${tracks.length} bai hat` : 'Mix danh rieng cho ban',
  };
};

export const recommendationService = {
  async getDailyMixes() {
    const response = await axiosClient.get(API_ENDPOINTS.RECOMMENDATIONS.DAILY_MIXES);
    const payload = getPayload(response);
    const data = asObject(payload?.data);
    const rawItems = asArray(data?.mixes);

    return {
      items: rawItems.map(normalizeDailyMix),
      source: readText(data?.source),
      dateKey: readText(data?.dateKey),
    };
  },
};

export default recommendationService;
