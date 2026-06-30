import axiosClient from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/apiEndpoints';
import {
  formatCompactNumber,
  formatDateLabel,
  formatDuration,
  formatMonthLabel,
  resolveImageUri,
} from '../utils/media';

const getPayload = (response) => response?.data || response || {};

const resolveTrackArtist = (item) => item?.artist || item?.artist_artistId || {};
const resolveTrackAlbum = (item) => item?.album || item?.album_albumId || {};

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
  const track = item?.track || {};
  const artist = resolveTrackArtist(track);

  return {
    id: track.id || track._id || '',
    title: track.title || 'Unknown track',
    artistName: artist?.name || 'Unknown artist',
    image: resolveImageUri(track.coverImage || track.avatar || artist?.avatar || artist?.coverImage),
    duration: Number(track.duration) || 0,
    rank: Number(item?.rank) || 0,
    playCount: Number(item?.playCount) || 0,
    uniqueListeners: Number(item?.uniqueListeners) || 0,
    date: item?.date || null,
    month: item?.month || null,
    rankTrend: item?.rankTrend || 'same',
    rankChange: Number(item?.rankChange) || 0,
  };
};

const normalizeTrackItem = (item, index = 0) => {
  const track = item?.track || item?.trackId || item || {};
  const artist = resolveTrackArtist(track);
  const album = resolveTrackAlbum(track);

  return {
    id: track.id || track._id || item?.trackId || `track-${index}`,
    title: track.title || 'Unknown track',
    subtitle: artist?.name || 'Unknown artist',
    artistId: artist?.id || artist?._id || '',
    artistName: artist?.name || 'Unknown artist',
    image: resolveImageUri(track.coverImage || track.avatar || album?.coverImage || artist?.avatar),
    duration: Number(track.duration) || 0,
    meta: formatDuration(track.duration),
  };
};

const normalizeTopTrackDetailItem = (item, index = 0) => ({
  id: item?.id || `track-${index}`,
  title: item?.title || 'Unknown track',
  subtitle: item?.artistName || 'Unknown artist',
  image: item?.image || '',
  entityType: 'track',
  entityId: item?.id || '',
  meta: `${formatCompactNumber(item?.playCount)} plays`,
});

const normalizeTrackDetail = (item) => {
  const track = item || {};
  const artist = resolveTrackArtist(track);
  const album = resolveTrackAlbum(track);
  const genresSource = Array.isArray(track?.genres) ? track.genres : Array.isArray(track?.genreIds) ? track.genreIds : [];
  const genres = genresSource
    .map((genre) => genre?.name || genre?.title || '')
    .filter(Boolean);

  return {
    id: track?.id || track?._id || '',
    type: 'track',
    title: track?.title || 'Unknown track',
    subtitle: artist?.name || 'Unknown artist',
    image: resolveImageUri(track?.coverImage || track?.avatar || album?.coverImage || artist?.avatar || artist?.coverImage),
    description: album?.title ? `From ${album.title}` : '',
    stats: [
      { label: 'Duration', value: formatDuration(track?.duration) },
      { label: 'Plays', value: formatCompactNumber(track?.stats?.totalPlay) },
      { label: 'Likes', value: formatCompactNumber(track?.stats?.totalLike) },
    ],
    meta: [
      {
        label: 'Artist',
        value: artist?.name || 'Unknown artist',
        entityType: artist?.id || artist?._id ? 'artist' : null,
        entityId: artist?.id || artist?._id || '',
      },
      { label: 'Album', value: album?.title || 'Single track' },
      { label: 'Released', value: formatDateLabel(track?.releaseDate) || 'Unknown' },
    ],
    tags: genres,
    extraTitle: 'Lyrics',
    extraText: track?.lyrics?.static || track?.lyricsStatic || 'No lyrics available.',
    itemsTitle: '',
    items: [],
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
    const items = Array.isArray(payload.topTracks) ? payload.topTracks.map(normalizeTrackRanking) : [];

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
    const items = Array.isArray(payload.topTracks) ? payload.topTracks.map(normalizeTrackRanking) : [];

    return {
      items,
      meta,
      totalItems: extractTotalItems(payload, meta),
    };
  },

  async getTrackDetail(trackId) {
    const response = await axiosClient.get(`${API_ENDPOINTS.TRACKS.DETAIL}/${trackId}`);
    const payload = getPayload(response);

    return normalizeTrackDetail(payload?.track || payload);
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
