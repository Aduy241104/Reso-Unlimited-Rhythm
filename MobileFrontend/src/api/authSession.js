import axios from 'axios';
import { API_ENDPOINTS } from './apiEndpoints';
import { tokenStorage } from '../storage/tokenStorage';
import { userStorage } from '../storage/userStorage';

let refreshPromise = null;
let sessionExpiredHandler = null;

const pickFirstString = (...values) =>
  values.find((value) => typeof value === 'string' && value.trim()) || '';

export const normalizeAuthPayload = (payload) => {
  const source = payload?.data && typeof payload.data === 'object' ? payload.data : payload || {};

  return {
    accessToken: pickFirstString(source.accessToken, source.access_token, source.token),
    refreshToken: pickFirstString(source.refreshToken, source.refresh_token),
    user: source.user || source.profile || source.account || null,
  };
};

export const setSessionExpiredHandler = (handler) => {
  sessionExpiredHandler = typeof handler === 'function' ? handler : null;
};

const notifySessionExpired = async () => {
  if (sessionExpiredHandler) {
    await sessionExpiredHandler();
  }
};

const buildRefreshRequestConfig = (refreshToken) => {
  const headers = {};

  if (refreshToken) {
    headers.Authorization = `Bearer ${refreshToken}`;
    headers['x-refresh-token'] = refreshToken;
    headers.Cookie = `refreshToken=${refreshToken}`;
  }

  return {
    headers,
    timeout: 5000,
  };
};

export const refreshAccessToken = async (baseURL) => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = await tokenStorage.getRefreshToken().catch(() => null);

    if (!refreshToken) {
      await tokenStorage.clearTokens().catch(() => {});
      await userStorage.clearUserProfile().catch(() => {});
      await notifySessionExpired().catch(() => {});
      throw {
        message: 'Session expired. Please log in again.',
        status: 401,
      };
    }

    try {
      const response = await axios.post(
        `${baseURL}${API_ENDPOINTS.AUTH.REFRESH_TOKEN}`,
        { refreshToken },
        buildRefreshRequestConfig(refreshToken)
      );

      const { accessToken, refreshToken: nextRefreshToken, user } = normalizeAuthPayload(response.data);

      if (!accessToken) {
        throw new Error('Refresh token invalid');
      }

      await tokenStorage.setAccessToken(accessToken).catch(() => {});

      if (nextRefreshToken) {
        await tokenStorage.setRefreshToken(nextRefreshToken).catch(() => {});
      }

      if (user) {
        await userStorage.setUserProfile(user).catch(() => {});
      }

      return {
        accessToken,
        refreshToken: nextRefreshToken || refreshToken,
        user,
      };
    } catch (error) {
      await tokenStorage.clearTokens().catch(() => {});
      await userStorage.clearUserProfile().catch(() => {});
      await notifySessionExpired().catch(() => {});

      throw {
        message: error?.response?.data?.message || error?.message || 'Session expired. Please log in again.',
        status: error?.response?.status || 401,
      };
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};
