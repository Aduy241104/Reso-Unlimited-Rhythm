import axiosClient from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/apiEndpoints';
import {
  formatCompactNumber,
  formatDateLabel,
  formatDuration,
  formatMonthLabel,
  resolveImageUri,
} from '../utils/media';
import {
  resolveTrackAudioUri,
  resolveTrackLrc,
  resolveTrackLyricsSyncUrl,
  resolveTrackStaticLyrics,
} from '../utils/player';

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

const getCollectionTitle = (period) => (period === 'monthly' ? 'BXH bài hát tháng' : 'BXH bài hát ngày');

const getCollectionLabel = ({ period, date, month }) => {
  if (period === 'monthly') {
    return formatMonthLabel(month) || month || 'Tháng này';
  }

  return formatDateLabel(date) || date || 'Hôm nay';
};

const normalizeTrackRanking = (item) => {
  const track = asObject(item?.track);
  const artist = resolveTrackArtist(track);
  const rawItem = asObject(item);
  const album = resolveTrackAlbum(track);
  const audioSource = pickFirstDefined(rawItem.audioSource, resolveTrackAudioUri(rawItem), resolveTrackAudioUri(track), '');

  return {
    ...track,
    ...rawItem,
    id: pickFirstDefined(rawItem.id, rawItem._id, track.id, track._id, ''),
    title: pickFirstDefined(rawItem.title, track.title, 'Bài hát không xác định'),
    artistId: pickFirstDefined(rawItem.artistId, artist?.id, artist?._id, ''),
    artistName: pickFirstDefined(rawItem.artistName, rawItem.artist?.name, artist?.name, 'Nghệ sĩ không xác định'),
    albumId: pickFirstDefined(rawItem.albumId, album?.id, album?._id, ''),
    albumTitle: pickFirstDefined(rawItem.albumTitle, album?.title, ''),
    image: pickFirstDefined(
      rawItem.image,
      rawItem.coverImage,
      resolveImageUri(track.coverImage || track.avatar || artist?.avatar || artist?.coverImage),
      ''
    ),
    duration: pickNumber(rawItem.duration, track.duration),
    audioUri: pickFirstDefined(rawItem.audioUri, audioSource, ''),
    audioSource,
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
  const audioSource = pickFirstDefined(rawItem.audioSource, resolveTrackAudioUri(rawItem), resolveTrackAudioUri(track), '');

  return {
    ...track,
    ...rawItem,
    id: pickFirstDefined(rawItem.id, rawItem._id, track.id, track._id, rawItem.trackId, `track-${index}`),
    title: pickFirstDefined(rawItem.title, track.title, 'Bài hát không xác định'),
    subtitle: pickFirstDefined(rawItem.subtitle, rawItem.artistName, artist?.name, 'Nghệ sĩ không xác định'),
    artistId: pickFirstDefined(rawItem.artistId, artist?.id, artist?._id, ''),
    artistName: pickFirstDefined(rawItem.artistName, artist?.name, 'Nghệ sĩ không xác định'),
    albumId: pickFirstDefined(rawItem.albumId, album?.id, album?._id, ''),
    albumTitle: pickFirstDefined(rawItem.albumTitle, album?.title, ''),
    image: pickFirstDefined(
      rawItem.image,
      rawItem.coverImage,
      resolveImageUri(track.coverImage || track.avatar || album?.coverImage || artist?.avatar),
      ''
    ),
    duration: pickNumber(rawItem.duration, track.duration),
    audioUri: pickFirstDefined(rawItem.audioUri, audioSource, ''),
    audioSource,
    meta: pickFirstDefined(rawItem.meta, formatDuration(pickNumber(rawItem.duration, track.duration))),
  };
};

const normalizeTopTrackDetailItem = (item, index = 0) => {
  const rawItem = asObject(item);
  const audioSource = pickFirstDefined(rawItem.audioSource, resolveTrackAudioUri(rawItem), '');

  return {
    ...rawItem,
    id: pickFirstDefined(rawItem.id, rawItem._id, `track-${index}`),
    title: pickFirstDefined(rawItem.title, 'Bài hát không xác định'),
    subtitle: pickFirstDefined(rawItem.subtitle, rawItem.artistName, 'Nghệ sĩ không xác định'),
    artistId: pickFirstDefined(rawItem.artistId, ''),
    artistName: pickFirstDefined(rawItem.artistName, 'Nghệ sĩ không xác định'),
    albumId: pickFirstDefined(rawItem.albumId, ''),
    albumTitle: pickFirstDefined(rawItem.albumTitle, ''),
    image: pickFirstDefined(rawItem.image, rawItem.coverImage, ''),
    entityType: pickFirstDefined(rawItem.entityType, 'track'),
    entityId: pickFirstDefined(rawItem.entityId, rawItem.id, rawItem._id, ''),
    duration: pickNumber(rawItem.duration),
    audioUri: pickFirstDefined(rawItem.audioUri, audioSource, ''),
    audioSource,
    meta: pickFirstDefined(rawItem.meta, `${formatCompactNumber(rawItem?.playCount)} lượt phát`),
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
  const audioSource = pickFirstDefined(track.audioSource, resolveTrackAudioUri(track), '');

  return {
    ...track,
    id: pickFirstDefined(track.id, track._id, ''),
    type: pickFirstDefined(track.type, 'track'),
    entityType: pickFirstDefined(track.entityType, 'track'),
    entityId: pickFirstDefined(track.entityId, track.id, track._id, ''),
    title: pickFirstDefined(track.title, 'Bài hát không xác định'),
    subtitle: pickFirstDefined(track.subtitle, track.artistName, artist?.name, 'Nghệ sĩ không xác định'),
    artistId: pickFirstDefined(track.artistId, artist?.id, artist?._id, ''),
    artistName: pickFirstDefined(track.artistName, artist?.name, 'Nghệ sĩ không xác định'),
    albumId: pickFirstDefined(track.albumId, album?.id, album?._id, ''),
    albumTitle: pickFirstDefined(track.albumTitle, album?.title, ''),
    image: pickFirstDefined(
      track.image,
      track.coverImage,
      resolveImageUri(track?.coverImage || track?.avatar || album?.coverImage || artist?.avatar || artist?.coverImage),
      ''
    ),
    duration: pickNumber(track.duration),
    audioUri: pickFirstDefined(track.audioUri, audioSource, ''),
    audioSource,
    description: pickFirstDefined(track.description, album?.title ? `Từ album ${album.title}` : '', ''),
    stats: asArray(track.stats).length > 0
      ? track.stats
      : [
          { label: 'Thời lượng', value: formatDuration(track?.duration) },
          { label: 'Lượt phát', value: formatCompactNumber(track?.stats?.totalPlay) },
          { label: 'Lượt thích', value: formatCompactNumber(track?.stats?.totalLike) },
        ],
    meta: asArray(track.meta).length > 0
      ? track.meta
      : [
          {
            label: 'Nghệ sĩ',
            value: artist?.name || 'Nghệ sĩ không xác định',
            entityType: artist?.id || artist?._id ? 'artist' : null,
            entityId: artist?.id || artist?._id || '',
          },
          { label: 'Album', value: album?.title || 'Đĩa đơn' },
          { label: 'Phát hành', value: formatDateLabel(track?.releaseDate) || 'Không xác định' },
        ],
    tags: asArray(track.tags).length > 0 ? track.tags : genres,
    extraTitle: pickFirstDefined(track.extraTitle, 'Lời bài hát'),
    extraText: resolveTrackStaticLyrics(track) || 'Chưa có lời bài hát.',
    lyrics: pickFirstDefined(track.lyrics, resolveTrackStaticLyrics(track), 'Chưa có lời bài hát.'),
    lrc: resolveTrackLrc(track),
    lyricsSyncUrl: resolveTrackLyricsSyncUrl(track),
    itemsTitle: pickFirstDefined(track.itemsTitle, ''),
    items: asArray(track.items),
  };
};

const normalizeTrackPlayback = (item, trackId = '') => {
  const playback = asObject(item);
  const artist = resolveTrackArtist(playback);
  const album = resolveTrackAlbum(playback);
  const audioSource = pickFirstDefined(playback.audioSource, resolveTrackAudioUri(playback), '');

  return {
    ...playback,
    id: pickFirstDefined(playback.id, playback.trackId, trackId, ''),
    trackId: pickFirstDefined(playback.trackId, playback.id, trackId, ''),
    title: pickFirstDefined(playback.title, 'Bài hát không xác định'),
    artistId: pickFirstDefined(playback.artistId, artist?.id, artist?._id, ''),
    artistName: pickFirstDefined(playback.artistName, playback.artist?.name, artist?.name, 'Nghệ sĩ không xác định'),
    albumId: pickFirstDefined(playback.albumId, album?.id, album?._id, ''),
    albumTitle: pickFirstDefined(playback.albumTitle, album?.title, ''),
    image: pickFirstDefined(
      playback.image,
      playback.coverImage,
      resolveImageUri(playback.coverImage || playback.avatar || artist?.avatar || artist?.coverImage),
      ''
    ),
    audioUri: pickFirstDefined(playback.audioUri, audioSource, ''),
    audioSource,
    duration: pickNumber(playback.duration),
    lyrics: pickFirstDefined(playback.lyrics, resolveTrackStaticLyrics(playback), ''),
    lrc: resolveTrackLrc(playback),
    lyricsSyncUrl: resolveTrackLyricsSyncUrl(playback),
    raw: playback.raw || playback,
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
    badgeLabel: period === 'monthly' ? 'THÁNG' : 'NGÀY',
    title: getCollectionTitle(period),
    subtitle: periodLabel,
    description: leadingTrack
      ? `Bài dẫn đầu: ${leadingTrack.title} - ${leadingTrack.artistName}`
      : 'Mở bảng xếp hạng để xem thứ hạng hiện tại.',
    image: leadingTrack?.image || '',
    primaryMeta: hasKnownCount ? `${totalItems} bài hát` : 'Mở chi tiết BXH',
    secondaryMeta: leadingTrack ? `#1 ${leadingTrack.title}` : 'Mở chi tiết',
  };
};

const normalizeTopTrackCollectionDetail = ({ period, date, month, items = [], totalItems = 0 }) => {
  const collectionLabel = getCollectionLabel({ period, date, month });
  const leadingTrack = items[0];

  return {
    id: `${period}-${date || month || 'chart'}`,
    type: 'topTrackCollection',
    badgeLabel: period === 'monthly' ? 'BXH THÁNG' : 'BXH NGÀY',
    title: getCollectionTitle(period),
    subtitle: collectionLabel,
    image: leadingTrack?.image || '',
    description: `Bảng xếp hạng của ${collectionLabel}. Mở một bài hát bên dưới để xem chi tiết đầy đủ.`,
    stats: [
      { label: 'Bài hát', value: `${totalItems || items.length}` },
      { label: 'Lượt phát hạng 1', value: formatCompactNumber(leadingTrack?.playCount) },
      { label: period === 'monthly' ? 'Tháng' : 'Ngày', value: collectionLabel },
    ],
    meta: [
      { label: 'Loại BXH', value: getCollectionTitle(period) },
      { label: 'Bài dẫn đầu', value: leadingTrack ? `${leadingTrack.title} - ${leadingTrack.artistName}` : 'Không xác định' },
      { label: 'Số bài đã tải', value: `${items.length} bài hát` },
    ],
    tags: [],
    extraTitle: '',
    extraText: '',
    itemsTitle: 'Bài hát trong BXH',
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

  async getTrackSyncedLyrics(trackOrUrl) {
    const lyricsSyncUrl =
      typeof trackOrUrl === 'string'
        ? resolveTrackLyricsSyncUrl({ lyricsSyncUrl: trackOrUrl })
        : resolveTrackLyricsSyncUrl(trackOrUrl);

    if (!lyricsSyncUrl) {
      throw new Error('Track playback does not include a synced lyrics URL.');
    }

    const response = await axiosClient.get(lyricsSyncUrl, {
      responseType: 'text',
      headers: {
        Accept: 'text/plain, text/*, application/octet-stream, */*',
      },
    });

    const lyricsText =
      typeof response === 'string'
        ? response
        : typeof response?.data === 'string'
          ? response.data
          : typeof response?.data?.data === 'string'
            ? response.data.data
            : '';

    if (!lyricsText.trim()) {
      throw new Error('The synced lyrics response is empty.');
    }

    return lyricsText;
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
