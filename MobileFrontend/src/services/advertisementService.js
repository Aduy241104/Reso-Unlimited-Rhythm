import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosClient from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/apiEndpoints';

const SESSION_KEY = 'reso.advertisement.session.v1';
let cachedSessionId = '';

const createSessionId = () => `mobile-ad-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const getAdvertisementSessionId = async () => {
  if (cachedSessionId) {
    return cachedSessionId;
  }

  try {
    const storedSessionId = await AsyncStorage.getItem(SESSION_KEY);
    if (storedSessionId) {
      cachedSessionId = storedSessionId;
      return cachedSessionId;
    }
  } catch {}

  cachedSessionId = createSessionId();
  await AsyncStorage.setItem(SESSION_KEY, cachedSessionId).catch(() => {});
  return cachedSessionId;
};

export const createAdvertisementTransitionId = () =>
  `mobile-transition-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const requestAdvertisementDecision = async ({
  type = 'audio',
  placement = 'between_tracks',
  transitionId = createAdvertisementTransitionId(),
  genreIds = [],
} = {}) => {
  try {
    const response = await axiosClient.post(API_ENDPOINTS.ADVERTISEMENTS.DECISION, {
      sessionId: await getAdvertisementSessionId(),
      type,
      placement,
      transitionId,
      genreIds,
    });

    return response?.data?.data || response?.data || response || null;
  } catch {
    return null;
  }
};

export const recordAdvertisementEvent = async ({
  decisionToken,
  eventType,
  playedSeconds = 0,
} = {}) => {
  if (!decisionToken || !eventType) {
    return null;
  }

  try {
    return await axiosClient.post(API_ENDPOINTS.ADVERTISEMENTS.EVENTS, {
      decisionToken,
      eventType,
      playedSeconds: Math.max(Number(playedSeconds) || 0, 0),
    });
  } catch {
    return null;
  }
};

export default {
  getAdvertisementSessionId,
  createAdvertisementTransitionId,
  requestAdvertisementDecision,
  recordAdvertisementEvent,
};
