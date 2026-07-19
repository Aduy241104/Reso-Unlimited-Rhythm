import axiosClient from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/apiEndpoints';

const FOLLOWED_ARTISTS_PAGE_LIMIT = 50;

const getPayload = (response) => response?.data || response || {};
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

const normalizeFollowState = (artistId, payload = {}) => {
  const follow = payload?.follow || payload?.data?.follow || payload?.data || payload || {};

  return {
    artistId: String(pickFirstDefined(follow?.artistId, follow?.id, artistId, '')),
    isFollowing: Boolean(follow?.isFollowing),
    followers: pickNumber(follow?.followers),
  };
};

const resolveFollowedArtistsSource = (payload) => payload?.artists || payload?.data?.artists || payload?.data || [];
const resolvePaginationSource = (payload, response) =>
  payload?.pagination || payload?.meta || response?.meta || response?.pagination || null;

const getFollowedArtistsPage = async (page = 1) => {
  const response = await axiosClient.get(API_ENDPOINTS.LIBRARY.FOLLOWED_ARTISTS, {
    params: {
      page,
      limit: FOLLOWED_ARTISTS_PAGE_LIMIT,
    },
  });
  const payload = getPayload(response);

  return {
    items: asArray(resolveFollowedArtistsSource(payload)),
    pagination: resolvePaginationSource(payload, response),
  };
};

export const artistFollowService = {
  async getArtistFollowStatus(artistId) {
    const normalizedArtistId = String(artistId || '').trim();

    if (!normalizedArtistId) {
      return {
        artistId: '',
        isFollowing: false,
        followers: 0,
      };
    }

    let page = 1;
    let totalPages = 1;

    do {
      const result = await getFollowedArtistsPage(page);
      const matchedArtist = result.items.find((item) => {
        const currentArtistId = String(item?.artistId || item?.entityId || item?.id || '').trim();
        return currentArtistId === normalizedArtistId;
      });

      if (matchedArtist) {
        return {
          artistId: normalizedArtistId,
          isFollowing: true,
          followers: 0,
        };
      }

      totalPages = Math.max(
        pickNumber(result?.pagination?.totalPages),
        result.items.length === FOLLOWED_ARTISTS_PAGE_LIMIT ? page + 1 : page
      );
      page += 1;
    } while (page <= totalPages);

    return {
      artistId: normalizedArtistId,
      isFollowing: false,
      followers: 0,
    };
  },

  async toggleArtistFollow(artistId) {
    const encodedArtistId = encodeURIComponent(artistId);
    const response = await axiosClient.patch(`${API_ENDPOINTS.ARTISTS.DETAIL}/${encodedArtistId}/follow/toggle`);
    const payload = getPayload(response);

    return normalizeFollowState(artistId, payload);
  },
};

export default artistFollowService;
