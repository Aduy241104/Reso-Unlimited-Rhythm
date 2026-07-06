import axiosClient from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/apiEndpoints';
import { formatCompactNumber, resolveImageUri } from '../utils/media';
import { resolveTrackAudioUri } from '../utils/player';

const normalizeArtistRanking = (item) => {
  const artist = item?.artist || {};

  return {
    id: artist.id || artist._id || '',
    name: artist.name || 'Unknown artist',
    avatar: artist.avatar || '',
    rank: item?.rank || 0,
    playCount: item?.playCount || 0,
    uniqueListeners: item?.uniqueListeners || 0,
    month: item?.month || null,
    score: item?.score || 0,
    completedPlayCount: item?.completedPlayCount || 0,
  };
};

const getPayload = (response) => response?.data || response || {};
const resolveProfileSource = (payload) => payload?.artist || payload?.profile || payload?.user || payload || null;

const normalizeArtistTrack = (item, index = 0) => {
  const track = item?.track || item || {};
  const artist = track?.artist || track?.artist_artistId || {};
  const album = track?.album || track?.album_albumId || {};

  return {
    id: track?.id || track?._id || `track-${index}`,
    title: track?.title || 'Unknown track',
    subtitle: artist?.name || 'Unknown artist',
    artistId: artist?.id || artist?._id || '',
    artistName: artist?.name || 'Unknown artist',
    albumId: album?.id || album?._id || '',
    albumTitle: album?.title || '',
    image: resolveImageUri(track?.coverImage || track?.avatar || artist?.avatar),
    entityType: 'track',
    entityId: track?.id || track?._id || '',
    duration: Number(track?.duration) || 0,
    audioUri: resolveTrackAudioUri(track),
    audioSource: resolveTrackAudioUri(track),
    meta: `${formatCompactNumber(track?.stats?.totalPlay || track?.playCount)} plays`,
  };
};

const normalizeArtistDetail = (payload, tracks = []) => {
  const profile = resolveProfileSource(payload);

  return {
    id: profile?.id || profile?._id || profile?.artistId || '',
    type: 'artist',
    title: profile?.stageName || profile?.artistName || profile?.displayName || profile?.fullName || profile?.name || 'Unknown artist',
    subtitle: profile?.role || 'Artist',
    image: resolveImageUri(profile?.avatar || profile?.image || profile?.coverImage),
    description: profile?.bio || profile?.about || profile?.description || '',
    stats: [
      { label: 'Listeners', value: formatCompactNumber(profile?.monthlyListeners || profile?.stats?.monthlyListeners) },
      { label: 'Followers', value: formatCompactNumber(profile?.followers || profile?.followersCount || profile?.stats?.followers) },
      { label: 'Tracks', value: `${tracks.length}` },
    ],
    meta: [
      { label: 'Role', value: profile?.role || 'Artist' },
      { label: 'Location', value: profile?.location || profile?.country || profile?.city || 'Unknown' },
      { label: 'Verified', value: profile?.verified || profile?.isVerified ? 'Yes' : 'No' },
    ],
    tags: [],
    extraTitle: '',
    extraText: '',
    itemsTitle: 'Tracks',
    items: tracks,
  };
};

export const artistService = {
  async getMonthlyTopArtists(params) {
    const response = await axiosClient.get(API_ENDPOINTS.ARTISTS.TOP_MONTHLY, { params });
    const payload = getPayload(response);

    return {
      items: Array.isArray(payload.topArtists) ? payload.topArtists.map(normalizeArtistRanking) : [],
      meta: response?.meta || payload?.meta || null,
    };
  },

  async getArtistDetail(artistId) {
    const encodedArtistId = encodeURIComponent(artistId);
    const [profileResult, tracksResult, comingReleasesResult] = await Promise.allSettled([
      axiosClient.get(`${API_ENDPOINTS.ARTISTS.DETAIL}/${encodedArtistId}/profile`),
      axiosClient.get(`${API_ENDPOINTS.ARTISTS.DETAIL}/${encodedArtistId}/tracks`, {
        params: { limit: 10 },
      }),
      axiosClient.get(`${API_ENDPOINTS.ARTISTS.DETAIL}/${encodedArtistId}/coming-releases`, {
        params: { limit: 10 },
      }),
    ]);

    if (profileResult.status !== 'fulfilled') {
      throw profileResult.reason;
    }

    const profilePayload = getPayload(profileResult.value);
    const tracksPayload = tracksResult.status === 'fulfilled' ? getPayload(tracksResult.value) : {};
    const comingReleasesPayload =
      comingReleasesResult.status === 'fulfilled' ? getPayload(comingReleasesResult.value) : {};
    const tracks = Array.isArray(tracksPayload?.tracks)
      ? tracksPayload.tracks.map(normalizeArtistTrack)
      : [];
    const comingReleases = Array.isArray(comingReleasesPayload?.comingReleases)
      ? comingReleasesPayload.comingReleases
      : [];

    return {
      ...normalizeArtistDetail(profilePayload, tracks),
      comingReleases,
    };
  },
};

export default artistService;
