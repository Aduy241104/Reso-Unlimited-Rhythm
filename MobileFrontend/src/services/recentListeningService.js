import axiosClient from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/apiEndpoints';
import { resolveImageUri } from '../utils/media';

const asArray = (value) => (Array.isArray(value) ? value : []);
const toNumber = (value) => {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

const normalizeChartPoint = (item = {}, index = 0) => ({
  id: item?.date || item?.label || `day-${index}`,
  date: item?.date || '',
  label: item?.label || '',
  listenCount: Math.max(0, toNumber(item?.listenCount)),
  listenedMinutes: Math.max(0, toNumber(item?.listenedMinutes)),
});

const normalizeTopGenre = (item = {}, index = 0) => ({
  id: item?.genreId || item?.id || `genre-${index}`,
  name: item?.name || 'Chưa phân loại',
  listenCount: Math.max(0, toNumber(item?.listenCount)),
  trackCount: Math.max(0, toNumber(item?.trackCount)),
  percentage: Math.min(100, Math.max(0, toNumber(item?.percentage))),
});

const normalizeTopTrack = (item = {}, index = 0) => ({
  id: item?.trackId || item?.id || `top-track-${index}`,
  entityId: item?.trackId || item?.id || '',
  entityType: 'track',
  title: item?.title || 'Bài hát chưa có tên',
  image: resolveImageUri(item?.image),
  listenCount: Math.max(0, toNumber(item?.listenCount)),
  listenedMinutes: Math.max(0, toNumber(item?.listenedMinutes)),
  genres: asArray(item?.genres),
});

const normalizeRecentTrack = (item = {}, index = 0) => ({
  id: item?.id || `recent-track-${index}`,
  listenedAt: item?.listenedAt || null,
  listenedDuration: Math.max(0, toNumber(item?.listenedDuration)),
  listenedMinutes: Math.max(0, toNumber(item?.listenedMinutes)),
  source: item?.source || '',
  track: {
    id: item?.track?.id || '',
    title: item?.track?.title || 'Bài hát chưa có tên',
    image: resolveImageUri(item?.track?.image),
    duration: Math.max(0, toNumber(item?.track?.duration)),
  },
  artist: {
    id: item?.artist?.id || '',
    name: item?.artist?.name || 'Nghệ sĩ không xác định',
    avatar: resolveImageUri(item?.artist?.avatar),
  },
  album: {
    id: item?.album?.id || '',
    title: item?.album?.title || '',
    coverImage: resolveImageUri(item?.album?.coverImage),
  },
});

const normalizeActivity = (activity = {}) => ({
  timezone: activity?.timezone || '',
  range: {
    days: Math.max(0, toNumber(activity?.range?.days)),
    from: activity?.range?.from || '',
    to: activity?.range?.to || '',
  },
  summary: {
    totalListens: Math.max(0, toNumber(activity?.summary?.totalListens)),
    totalMinutes: Math.max(0, toNumber(activity?.summary?.totalMinutes)),
    activeDays: Math.max(0, toNumber(activity?.summary?.activeDays)),
    latestTrackTitle: activity?.summary?.latestTrackTitle || '',
    today: {
      listenCount: Math.max(0, toNumber(activity?.summary?.today?.listenCount)),
      listenedMinutes: Math.max(0, toNumber(activity?.summary?.today?.listenedMinutes)),
    },
    yesterday: {
      listenCount: Math.max(0, toNumber(activity?.summary?.yesterday?.listenCount)),
      listenedMinutes: Math.max(0, toNumber(activity?.summary?.yesterday?.listenedMinutes)),
    },
    comparison: activity?.summary?.comparison || {},
  },
  chart: asArray(activity?.chart).map(normalizeChartPoint),
  topGenres: asArray(activity?.topGenres).map(normalizeTopGenre),
  topTracks: asArray(activity?.topTracks).map(normalizeTopTrack),
  recentTracks: asArray(activity?.recentTracks).map(normalizeRecentTrack),
});

export const recentListeningService = {
  async getMyRecentListeningActivity() {
    const response = await axiosClient.get(API_ENDPOINTS.USER_ACTIVITY.RECENT_LISTENING);
    const payload = response?.data || response || {};
    const activity = payload?.activity || payload?.data?.activity || payload;

    return normalizeActivity(activity);
  },
};

export default recentListeningService;
