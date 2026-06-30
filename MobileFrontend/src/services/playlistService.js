import axiosClient from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/apiEndpoints';
import { formatDateLabel, formatDuration, resolveImageUri } from '../utils/media';

const normalizePlaylist = (item) => ({
  id: item?.id || item?._id || '',
  title: item?.title || 'Untitled playlist',
  description: item?.description || '',
  coverImage: item?.coverImage || '',
  type: item?.type || 'system',
  trackCount: item?.trackCount || 0,
  totalDuration: item?.totalDuration || 0,
  isPublic: Boolean(item?.isPublic),
  createdAt: item?.createdAt || null,
});

const getPayload = (response) => response?.data || response || {};
const normalizePlaylistTrack = (item, index = 0) => {
  const track = item?.track || item?.trackId || item || {};
  const artist = track?.artist || track?.artist_artistId || {};
  const album = track?.album || track?.album_albumId || {};

  return {
    id: track?.id || track?._id || item?.trackId || `track-${index}`,
    title: track?.title || 'Unknown track',
    subtitle: artist?.name || 'Unknown artist',
    image: resolveImageUri(track?.coverImage || track?.avatar || album?.coverImage || artist?.avatar),
    entityType: 'track',
    entityId: track?.id || track?._id || '',
    meta: formatDuration(track?.duration),
  };
};

const normalizeOwner = (item) => {
  const owner = item?.owner || item?.userId || {};

  return owner?.fullName || owner?.profile?.fullName || owner?.name || owner?.email || 'Reso Music';
};

const normalizePlaylistDetail = (item) => {
  const tracks = Array.isArray(item?.tracks) ? item.tracks.map(normalizePlaylistTrack) : [];

  return {
    id: item?.id || item?._id || '',
    type: 'playlist',
    title: item?.title || 'Untitled playlist',
    subtitle: normalizeOwner(item),
    image: resolveImageUri(item?.coverImage),
    description: item?.description || '',
    stats: [
      { label: 'Tracks', value: `${item?.trackCount || tracks.length}` },
      { label: 'Duration', value: formatDuration(item?.totalDuration) },
      { label: 'Visibility', value: item?.isPublic ? 'Public' : 'System' },
    ],
    meta: [
      { label: 'Owner', value: normalizeOwner(item) },
      { label: 'Created', value: formatDateLabel(item?.createdAt) || 'Unknown' },
      { label: 'Type', value: item?.type || 'system' },
    ],
    tags: [],
    extraTitle: '',
    extraText: '',
    itemsTitle: 'Tracks',
    items: tracks,
  };
};

export const playlistService = {
  async getSystemPlaylists(params) {
    const response = await axiosClient.get(API_ENDPOINTS.PLAYLISTS.SYSTEM, { params });
    const payload = getPayload(response);

    return {
      items: Array.isArray(payload.playlists) ? payload.playlists.map(normalizePlaylist) : [],
      meta: response?.meta || payload?.meta || null,
    };
  },

  async getPlaylistDetail(playlistId) {
    const endpoints = [
      `${API_ENDPOINTS.PLAYLISTS.SYSTEM_DETAIL}/${playlistId}`,
      `${API_ENDPOINTS.PLAYLISTS.DETAIL}/${playlistId}`,
    ];

    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        const response = await axiosClient.get(endpoint);
        const payload = getPayload(response);

        return normalizePlaylistDetail(payload?.playlist || payload);
      } catch (error) {
        lastError = error;
        const status = error?.response?.status;

        if (status !== 404 && status !== 405) {
          throw error;
        }
      }
    }

    throw lastError;
  },
};

export default playlistService;
