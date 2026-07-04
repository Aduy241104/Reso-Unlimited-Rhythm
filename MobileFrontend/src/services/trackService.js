import axiosClient from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/apiEndpoints';
import {
  formatCompactNumber,
  formatDateLabel,
  formatDuration,
  formatMonthLabel,
  resolveImageUri,
} from '../utils/media';
import { resolveTrackAudioUri } from '../utils/player';

const getPayload = (response) => response?.data || response || {};

const resolveTrackArtist = (item) => item?.artist || item?.artist_artistId || {};
const resolveTrackAlbum = (item) => item?.album || item?.album_albumId || {};
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

const extractTotalItems = (payload, meta, fallback = 0) => {
  const candidates = [
    meta?.total,
    meta?.totalItems,
    meta?.pagination?.total,
    payload?.total,
    payload?.totalItems,
    payload?.count,
    payload?.pagination?.total,
  ];

  for (const value of candidates) {
    const parsedValue = Number(value);

    if (Number.isFinite(parsedValue) && parsedValue >= 0) {
      return parsedValue;
    }
  }

  return fallback;
};

const getCollectionTitle = (period) => (period === 'monthly' ? 'Monthly Top Tracks' : 'Daily Top Tracks');

const getCollectionLabel = ({ period, date, month }) => {
  if (period === 'monthly') {
    return formatMonthLabel(month) || month || 'This month';
  }

  return formatDateLabel(date) || date || 'Today';
};

const normalizeTrackRanking = (item) => {
  const track = asObject(item?.track);
  const artist = resolveTrackArtist(track);
  const rawItem = asObject(item);

  return {
    ...track,
    ...rawItem,
    id: pickFirstDefined(rawItem.id, rawItem._id, track.id, track._id, ''),
    title: pickFirstDefined(rawItem.title, track.title, 'Unknown track'),
    artistName: pickFirstDefined(rawItem.artistName, rawItem.artist?.name, artist?.name, 'Unknown artist'),
    image: pickFirstDefined(
      rawItem.image,
      rawItem.coverImage,
      resolveImageUri(track.coverImage || track.avatar || artist?.avatar || artist?.coverImage),
      ''
    ),
    duration: pickNumber(rawItem.duration, track.duration),
    audioUri: pickFirstDefined(rawItem.audioUri, resolveTrackAudioUri(rawItem), resolveTrackAudioUri(track), ''),
    rank: pickNumber(rawItem.rank),
    playCount: pickNumber(rawItem.playCount, rawItem.stats?.totalPlay, track.stats?.totalPlay),
    uniqueListeners: pickNumber(rawItem.uniqueListeners),
    date: pickFirstDefined(rawItem.date, null),
    month: pickFirstDefined(rawItem.month, null),
    rankTrend: pickFirstDefined(rawItem.rankTrend, 'same'),
    rankChange: pickNumber(rawItem.rankChange),
  };
};

const normalizeTrackItem = (item, index = 0) => {
  const rawItem = asObject(item);
  const track = asObject(item?.track || item?.trackId || item);
  const artist = resolveTrackArtist(track);
  const album = resolveTrackAlbum(track);

  return {
    ...track,
    ...rawItem,
    id: pickFirstDefined(rawItem.id, rawItem._id, track.id, track._id, rawItem.trackId, `track-${index}`),
    title: pickFirstDefined(rawItem.title, track.title, 'Unknown track'),
    subtitle: pickFirstDefined(rawItem.subtitle, rawItem.artistName, artist?.name, 'Unknown artist'),
    artistId: pickFirstDefined(rawItem.artistId, artist?.id, artist?._id, ''),
    artistName: pickFirstDefined(rawItem.artistName, artist?.name, 'Unknown artist'),
    image: pickFirstDefined(
      rawItem.image,
      rawItem.coverImage,
      resolveImageUri(track.coverImage || track.avatar || album?.coverImage || artist?.avatar),
      ''
    ),
    duration: pickNumber(rawItem.duration, track.duration),
    audioUri: pickFirstDefined(rawItem.audioUri, resolveTrackAudioUri(rawItem), resolveTrackAudioUri(track), ''),
    meta: pickFirstDefined(rawItem.meta, formatDuration(pickNumber(rawItem.duration, track.duration))),
  };
};

const normalizeTopTrackDetailItem = (item, index = 0) => {
  const rawItem = asObject(item);

  return {
    ...rawItem,
    id: pickFirstDefined(rawItem.id, rawItem._id, `track-${index}`),
    title: pickFirstDefined(rawItem.title, 'Unknown track'),
    subtitle: pickFirstDefined(rawItem.subtitle, rawItem.artistName, 'Unknown artist'),
    artistName: pickFirstDefined(rawItem.artistName, 'Unknown artist'),
    image: pickFirstDefined(rawItem.image, rawItem.coverImage, ''),
    entityType: pickFirstDefined(rawItem.entityType, 'track'),
    entityId: pickFirstDefined(rawItem.entityId, rawItem.id, rawItem._id, ''),
    duration: pickNumber(rawItem.duration),
    audioUri: pickFirstDefined(rawItem.audioUri, resolveTrackAudioUri(rawItem), ''),
    meta: pickFirstDefined(rawItem.meta, `${formatCompactNumber(rawItem?.playCount)} plays`),
  };
};

const normalizeTrackDetail = (item) => {
  const track = asObject(item);
  const artist = resolveTrackArtist(track);
  const album = resolveTrackAlbum(track);
  const genresSource = Array.isArray(track?.genres) ? track.genres : Array.isArray(track?.genreIds) ? track.genreIds : [];
  const genres = genresSource
    .map((genre) => genre?.name || genre?.title || '')
    .filter(Boolean);

  return {
    ...track,
    id: pickFirstDefined(track.id, track._id, ''),
    type: pickFirstDefined(track.type, 'track'),
    title: pickFirstDefined(track.title, 'Unknown track'),
    subtitle: pickFirstDefined(track.subtitle, track.artistName, artist?.name, 'Unknown artist'),
    artistName: pickFirstDefined(track.artistName, artist?.name, 'Unknown artist'),
    image: pickFirstDefined(
      track.image,
      track.coverImage,
      resolveImageUri(track?.coverImage || track?.avatar || album?.coverImage || artist?.avatar || artist?.coverImage),
      ''
    ),
    duration: pickNumber(track.duration),
    audioUri: pickFirstDefined(track.audioUri, resolveTrackAudioUri(track), ''),
    description: pickFirstDefined(track.description, album?.title ? `From ${album.title}` : '', ''),
    stats: asArray(track.stats).length > 0
      ? track.stats
      : [
          { label: 'Duration', value: formatDuration(track?.duration) },
          { label: 'Plays', value: formatCompactNumber(track?.stats?.totalPlay) },
          { label: 'Likes', value: formatCompactNumber(track?.stats?.totalLike) },
        ],
    meta: asArray(track.meta).length > 0
      ? track.meta
      : [
          {
            label: 'Artist',
            value: artist?.name || 'Unknown artist',
            entityType: artist?.id || artist?._id ? 'artist' : null,
            entityId: artist?.id || artist?._id || '',
          },
          { label: 'Album', value: album?.title || 'Single track' },
          { label: 'Released', value: formatDateLabel(track?.releaseDate) || 'Unknown' },
        ],
    tags: asArray(track.tags).length > 0 ? track.tags : genres,
    extraTitle: pickFirstDefined(track.extraTitle, 'Lyrics'),
    extraText: pickFirstDefined(track.extraText, track?.lyrics?.static, track?.lyricsStatic, 'No lyrics available.'),
    lyrics: pickFirstDefined(track.lyrics, track?.lyrics?.static, track?.lyricsStatic, 'No lyrics available.'),
    itemsTitle: pickFirstDefined(track.itemsTitle, ''),
    items: asArray(track.items),
  };
};

const normalizeTrackPlayback = (item, trackId = '') => {
  const playback = asObject(item);
  const artist = resolveTrackArtist(playback);

  return {
    ...playback,
    id: pickFirstDefined(playback.id, playback.trackId, trackId, ''),
    trackId: pickFirstDefined(playback.trackId, playback.id, trackId, ''),
    title: pickFirstDefined(playback.title, 'Unknown track'),
    artistName: pickFirstDefined(playback.artistName, playback.artist?.name, artist?.name, 'Unknown artist'),
    image: pickFirstDefined(
      playback.image,
      playback.coverImage,
      resolveImageUri(playback.coverImage || playback.avatar || artist?.avatar || artist?.coverImage),
      ''
    ),
    audioUri: pickFirstDefined(playback.audioUri, resolveTrackAudioUri(playback), ''),
    duration: pickNumber(playback.duration),
  };
};

const buildTopTrackCollectionSummary = ({ period, date, month, items = [], totalItems = 0 }) => {
  const leadingTrack = items[0];
  const periodLabel = getCollectionLabel({ period, date, month });
  const hasKnownCount = Number(totalItems) > 0;

  return {
    id: `${period}-${date || month || 'chart'}`,
    entityType: 'topTrackCollection',
    period,
    date: date || '',
    month: month || '',
    badgeLabel: period === 'monthly' ? 'MONTHLY' : 'DAILY',
    title: getCollectionTitle(period),
    subtitle: periodLabel,
    description: leadingTrack
      ? `Leading song: ${leadingTrack.title} by ${leadingTrack.artistName}`
      : 'Open the chart to view the current ranking.',
    image: leadingTrack?.image || '',
    primaryMeta: hasKnownCount ? `${totalItems} songs` : 'Open chart detail',
    secondaryMeta: leadingTrack ? `#1 ${leadingTrack.title}` : 'Open detail',
  };
};

const normalizeTopTrackCollectionDetail = ({ period, date, month, items = [], totalItems = 0 }) => {
  const collectionLabel = getCollectionLabel({ period, date, month });
  const leadingTrack = items[0];

  return {
    id: `${period}-${date || month || 'chart'}`,
    type: 'topTrackCollection',
    badgeLabel: period === 'monthly' ? 'MONTHLY CHART' : 'DAILY CHART',
    title: getCollectionTitle(period),
    subtitle: collectionLabel,
    image: leadingTrack?.image || '',
    description: `Chart ranking for ${collectionLabel}. Open a song below to see its full detail.`,
    stats: [
      { label: 'Songs', value: `${totalItems || items.length}` },
      { label: 'Leader Plays', value: formatCompactNumber(leadingTrack?.playCount) },
      { label: period === 'monthly' ? 'Month' : 'Date', value: collectionLabel },
    ],
    meta: [
      { label: 'Chart Type', value: getCollectionTitle(period) },
      { label: 'Leading Track', value: leadingTrack ? `${leadingTrack.title} - ${leadingTrack.artistName}` : 'Unknown' },
      { label: 'Preview Size', value: `${items.length} songs loaded` },
    ],
    tags: [],
    extraTitle: '',
    extraText: '',
    itemsTitle: 'Songs In Chart',
    items: items.map(normalizeTopTrackDetailItem),
  };
};

export const trackService = {
  async getDailyTopTracks(params) {
    const response = await axiosClient.get(API_ENDPOINTS.TRACKS.TOP_DAILY, { params });
    const payload = getPayload(response);
    const meta = response?.meta || payload?.meta || null;
    const rawItems = asArray(payload.topTracks || payload.items || payload.data);
    const items = rawItems.map(normalizeTrackRanking);

    return {
      items,
      meta,
      totalItems: extractTotalItems(payload, meta),
    };
  },

  async getMonthlyTopTracks(params) {
    const response = await axiosClient.get(API_ENDPOINTS.TRACKS.TOP_MONTHLY, { params });
    const payload = getPayload(response);
    const meta = response?.meta || payload?.meta || null;
    const rawItems = asArray(payload.topTracks || payload.items || payload.data);
    const items = rawItems.map(normalizeTrackRanking);

    return {
      items,
      meta,
      totalItems: extractTotalItems(payload, meta),
    };
  },

  async getTrackDetail(trackId) {
    const response = await axiosClient.get(`${API_ENDPOINTS.TRACKS.DETAIL}/${trackId}`);
    const payload = getPayload(response);

    return normalizeTrackDetail(payload?.track || payload?.data || payload);
  },

  async getTrackPlayback(trackId) {
    const response = await axiosClient.get(`${API_ENDPOINTS.TRACKS.PLAYBACK}/${trackId}/playback`);
    const payload = getPayload(response);
    const playbackTrack = payload?.track || payload?.data?.track || payload?.playback || payload?.data || payload;

    return normalizeTrackPlayback(playbackTrack, trackId);
  },

  buildTopTrackCollectionSummary,

  async getTopTrackCollectionDetail(params = {}) {
    const period = params?.period === 'monthly' ? 'monthly' : 'daily';
    const queryValue = period === 'monthly' ? params?.month : params?.date;
    const queryParams = {
      limit: params?.limit || 50,
    };

    if (period === 'monthly') {
      queryParams.month = queryValue;
    } else {
      queryParams.date = queryValue;
    }

    const rankingResult =
      period === 'monthly'
        ? await this.getMonthlyTopTracks(queryParams)
        : await this.getDailyTopTracks(queryParams);

    return normalizeTopTrackCollectionDetail({
      period,
      date: params?.date,
      month: params?.month,
      items: rankingResult.items,
      totalItems: rankingResult.totalItems,
    });
  },

  normalizeTrackItem,
};

export default trackService;
