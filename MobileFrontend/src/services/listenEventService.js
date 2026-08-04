import axiosClient from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/apiEndpoints';
import { tokenStorage } from '../storage/tokenStorage';

const VALID_LISTEN_SOURCES = new Set([
  'track_detail',
  'album',
  'playlist',
  'search',
  'artist_profile',
  'unknown',
]);
const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const normalizeListenSource = (value) => (
  VALID_LISTEN_SOURCES.has(value) ? value : 'unknown'
);

export const listenEventService = {
  async recordCompletedListenAttempt({
    trackId,
    listenedDuration,
    source = 'unknown',
  } = {}) {
    const normalizedTrackId = String(trackId || '').trim();
    const normalizedListenedDuration = Math.max(
      0,
      Math.floor(Number(listenedDuration) || 0)
    );

    if (!objectIdPattern.test(normalizedTrackId) || normalizedListenedDuration <= 0) {
      return null;
    }

    const accessToken = await tokenStorage.getAccessToken().catch(() => null);

    if (!accessToken) {
      return null;
    }

    try {
      return await axiosClient.post(API_ENDPOINTS.LISTEN_EVENTS.COMPLETE, {
        trackId: normalizedTrackId,
        listenedDuration: normalizedListenedDuration,
        source: normalizeListenSource(source),
      });
    } catch (error) {
      if (Number(error?.status) !== 401) {
        console.log('Không thể ghi nhận lượt nghe trên mobile.', error?.message || error);
      }

      return null;
    }
  },
};

export default listenEventService;
