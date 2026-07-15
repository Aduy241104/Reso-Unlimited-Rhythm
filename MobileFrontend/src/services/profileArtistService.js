import axiosClient from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/apiEndpoints';
import { formatCompactNumber, resolveImageUri } from '../utils/media';
import { resolveTrackAudioUri } from '../utils/player';

const ARTIST_TRACK_PAGE_LIMIT = 50;

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

const getPayload = (response) => response?.data || response || {};
const resolveProfileSource = (payload) => payload?.artist || payload?.profile || payload?.user || payload || null;
const resolveArtistTracksSource = (payload) => payload?.tracks || payload?.data?.tracks || payload?.items || payload?.data || [];
const resolveComingReleasesSource = (payload) =>
  payload?.comingReleases || payload?.data?.comingReleases || payload?.items || payload?.data || [];
const resolvePaginationSource = (payload, response) =>
  payload?.pagination || payload?.meta || response?.meta || response?.pagination || null;

const normalizeArtistTrack = (item, index = 0, artistProfile = {}) => {
  const track = item?.track || item || {};
  const artist = track?.artist || track?.artist_artistId || artistProfile || {};
  const album = track?.album || track?.album_albumId || {};
  const audioSource = resolveTrackAudioUri(track);
  const artistName = pickFirstDefined(
    artist?.name,
    artistProfile?.name,
    artistProfile?.artistName,
    artistProfile?.displayName,
    'Nghệ sĩ không xác định'
  );
  const artistId = pickFirstDefined(
    artist?.id,
    artist?._id,
    artistProfile?.id,
    artistProfile?._id,
    artistProfile?.artistId,
    ''
  );

  return {
    id: track?.id || track?._id || `track-${index}`,
    title: track?.title || 'Bài hát không xác định',
    subtitle: artistName,
    artistId,
    artistName,
    albumId: album?.id || album?._id || '',
    albumTitle: album?.title || '',
    image: resolveImageUri(
      track?.coverImage ||
      track?.avatar ||
      album?.coverImage ||
      artist?.avatar ||
      artistProfile?.avatar ||
      artistProfile?.coverImage
    ),
    entityType: 'track',
    entityId: track?.id || track?._id || '',
    duration: Number(track?.duration) || 0,
    audioUri: audioSource,
    audioSource,
    meta: `${formatCompactNumber(track?.stats?.totalPlay || track?.playCount)} lượt phát`,
  };
};

const normalizeArtistDetail = (payload, tracks = []) => {
  const rawPayload = asObject(payload);
  const profile = asObject(resolveProfileSource(rawPayload));
  const albums = asArray(rawPayload?.albums);
  const artistName =
    profile?.stageName ||
    profile?.artistName ||
    profile?.displayName ||
    profile?.fullName ||
    profile?.name ||
    'Nghệ sĩ không xác định';
  const followers = pickNumber(profile?.followers, profile?.followersCount, profile?.stats?.followers);
  const monthlyListeners = pickNumber(profile?.monthlyListeners, profile?.stats?.monthlyListeners);
  const totalStreams = pickNumber(profile?.totalStreams, profile?.stats?.totalStreams);
  const albumCount = pickNumber(profile?.albumCount, albums.length);
  const trackCount = pickNumber(profile?.trackCount, tracks.length);
  const bio = pickFirstDefined(profile?.bio, profile?.about, profile?.description, '');
  const verified = Boolean(profile?.verified || profile?.isVerified || profile?.verificationStatus === 'verified');
  const socialLinks = asObject(profile?.socialLinks);
  const socialLinkCount = Object.values(socialLinks).filter(Boolean).length;
  const summaryText = followers > 0
    ? `${formatCompactNumber(followers)} người theo dõi`
    : trackCount > 0
      ? `${trackCount} bài hát`
      : 'Hồ sơ nghệ sĩ';

  return {
    id: profile?.id || profile?._id || profile?.artistId || '',
    type: 'artist',
    title: artistName,
    subtitle: '',
    followersCount: followers,
    trackCount,
    albumCount,
    isFollowing: false,
    image: resolveImageUri(profile?.avatar || profile?.image || profile?.coverImage),
    description: summaryText,
    stats: [
      { label: 'Người nghe hàng tháng', value: formatCompactNumber(monthlyListeners) },
      { label: 'Người theo dõi', value: formatCompactNumber(followers) },
      { label: 'Lượt phát', value: formatCompactNumber(totalStreams) },
      { label: 'Bài hát', value: `${trackCount}` },
    ],
    meta: [
      { label: 'Album', value: `${albumCount}` },
      { label: 'Mạng xã hội', value: `${socialLinkCount}` },
      { label: 'Xác minh', value: verified ? 'Có' : 'Không' },
    ],
    tags: [],
    extraTitle: bio ? 'Giới thiệu' : '',
    extraText: bio,
    itemsTitle: 'Tất cả bài hát',
    items: tracks,
  };
};

const getArtistTracksPage = async (artistId, page = 1) => {
  const encodedArtistId = encodeURIComponent(artistId);
  const response = await axiosClient.get(`${API_ENDPOINTS.ARTISTS.DETAIL}/${encodedArtistId}/tracks`, {
    params: {
      page,
      limit: ARTIST_TRACK_PAGE_LIMIT,
    },
  });
  const payload = getPayload(response);

  return {
    items: asArray(resolveArtistTracksSource(payload)),
    pagination: resolvePaginationSource(payload, response),
  };
};

const getAllArtistTracks = async (artistId) => {
  const firstPage = await getArtistTracksPage(artistId, 1);
  const total = pickNumber(firstPage?.pagination?.total, firstPage.items.length);
  const limit = pickNumber(firstPage?.pagination?.limit, ARTIST_TRACK_PAGE_LIMIT) || ARTIST_TRACK_PAGE_LIMIT;
  const totalPages = Math.max(
    pickNumber(firstPage?.pagination?.totalPages),
    total > 0 ? Math.ceil(total / limit) : firstPage.items.length > 0 ? 1 : 0
  );

  if (totalPages <= 1) {
    return firstPage.items;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => getArtistTracksPage(artistId, index + 2))
  );

  return [
    ...firstPage.items,
    ...remainingPages.flatMap((result) => result.items),
  ];
};

export const profileArtistService = {
  async getArtistDetail(artistId) {
    const encodedArtistId = encodeURIComponent(artistId);
    const [profileResult, comingReleasesResult] = await Promise.allSettled([
      axiosClient.get(`${API_ENDPOINTS.ARTISTS.DETAIL}/${encodedArtistId}/profile`),
      axiosClient.get(`${API_ENDPOINTS.ARTISTS.DETAIL}/${encodedArtistId}/coming-releases`, {
        params: { limit: 10 },
      }),
    ]);

    if (profileResult.status !== 'fulfilled') {
      throw profileResult.reason;
    }

    const profilePayload = getPayload(profileResult.value);
    const profile = asObject(resolveProfileSource(profilePayload));
    const expectedTrackCount = pickNumber(profile?.trackCount);
    let rawTracks = asArray(resolveArtistTracksSource(profilePayload));

    if (rawTracks.length === 0 || (expectedTrackCount > 0 && rawTracks.length < expectedTrackCount)) {
      try {
        rawTracks = await getAllArtistTracks(artistId);
      } catch (error) {
        if (rawTracks.length === 0) {
          throw error;
        }
      }
    }

    const comingReleasesPayload =
      comingReleasesResult.status === 'fulfilled' ? getPayload(comingReleasesResult.value) : {};
    const tracks = rawTracks.map((item, index) => normalizeArtistTrack(item, index, profile));
    const comingReleases = asArray(resolveComingReleasesSource(comingReleasesPayload));

    return {
      ...normalizeArtistDetail(profilePayload, tracks),
      comingReleases,
    };
  },
};

export default profileArtistService;
