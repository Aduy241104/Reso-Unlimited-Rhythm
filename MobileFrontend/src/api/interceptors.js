import { tokenStorage } from '../storage/tokenStorage';
import { API_BASE_URL_CANDIDATES, setApiBaseUrl } from '../config/api';
import { refreshAccessToken } from './authSession';
import { API_ENDPOINTS } from './apiEndpoints';

const PUBLIC_AUTH_ENDPOINTS = [
  API_ENDPOINTS.AUTH.LOGIN,
  API_ENDPOINTS.AUTH.GOOGLE,
  API_ENDPOINTS.AUTH.REGISTER,
  API_ENDPOINTS.AUTH.REGISTER_SEND_OTP,
  API_ENDPOINTS.AUTH.FORGOT_PASSWORD,
  API_ENDPOINTS.AUTH.MOBILE_FORGOT_PASSWORD,
  API_ENDPOINTS.AUTH.RESET_PASSWORD,
];

const shouldSkipAuthHeader = (requestUrl = '') =>
  PUBLIC_AUTH_ENDPOINTS.some((path) => requestUrl.includes(path));

const shouldSkipRefresh = (requestUrl = '') =>
  [
    ...PUBLIC_AUTH_ENDPOINTS,
    API_ENDPOINTS.AUTH.REFRESH_TOKEN,
    API_ENDPOINTS.AUTH.LOGOUT,
  ].some((path) => requestUrl.includes(path));

const shouldLogAuthRequest = (requestUrl = '') =>
  [
    ...PUBLIC_AUTH_ENDPOINTS,
    API_ENDPOINTS.AUTH.REFRESH_TOKEN,
    API_ENDPOINTS.AUTH.LOGOUT,
    API_ENDPOINTS.AUTH.ME,
  ].some((path) => requestUrl.includes(path));

const normalizeBaseUrl = (value = '') => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().replace(/\/+$/, '');
};

const getFullRequestUrl = (config = {}) => `${normalizeBaseUrl(config.baseURL)}${config.url || ''}`;

const maskSensitiveValue = (key, value) => {
  const normalizedKey = String(key || '').toLowerCase();

  if (
    normalizedKey.includes('password') ||
    normalizedKey.includes('token') ||
    normalizedKey.includes('authorization')
  ) {
    return value ? '***' : value;
  }

  return value;
};

const sanitizeForLog = (value) => {
  if (!value || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item));
  }

  return Object.entries(value).reduce((nextValue, [key, itemValue]) => {
    nextValue[key] =
      itemValue && typeof itemValue === 'object'
        ? sanitizeForLog(itemValue)
        : maskSensitiveValue(key, itemValue);
    return nextValue;
  }, {});
};

const parseRequestData = (data) => {
  if (!data) {
    return null;
  }

  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }

  return data;
};

export const setupInterceptors = (axiosInstance) => {
  axiosInstance.interceptors.request.use(
    async (config) => {
      if (shouldLogAuthRequest(config.url || '')) {
        console.log('AUTH REQUEST:', {
          method: (config.method || 'get').toUpperCase(),
          url: getFullRequestUrl(config),
          body: sanitizeForLog(parseRequestData(config.data)),
        });
      }

      try {
        const tokenPromise = tokenStorage.getAccessToken();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('SecureStore Timeout')), 2000)
        );

        const token = await Promise.race([tokenPromise, timeoutPromise]).catch(() => null);

        if (shouldSkipAuthHeader(config.url || '')) {
          if (config.headers?.Authorization) {
            delete config.headers.Authorization;
          }
          return config;
        }

        if (token && !config.headers?.Authorization) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (storageError) {
        console.log('Storage warning: unable to read access token.', storageError.message);
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

  axiosInstance.interceptors.response.use(
    (response) => {
      const resolvedBaseUrl = normalizeBaseUrl(response?.config?.baseURL);

      if (resolvedBaseUrl) {
        setApiBaseUrl(resolvedBaseUrl);
        axiosInstance.defaults.baseURL = resolvedBaseUrl;
      }

      if (shouldLogAuthRequest(response?.config?.url || '')) {
        console.log('AUTH RESPONSE:', {
          method: (response.config?.method || 'get').toUpperCase(),
          url: getFullRequestUrl(response.config),
          status: response.status,
          data: sanitizeForLog(response.data),
        });
      }

      return response.data;
    },
    async (error) => {
      const originalRequest = error?.config || {};

      if (!error?.response) {
        const currentBaseUrl = normalizeBaseUrl(originalRequest.baseURL || axiosInstance.defaults.baseURL);
        const attemptedBaseUrls = Array.isArray(originalRequest._attemptedBaseUrls)
          ? originalRequest._attemptedBaseUrls.map(normalizeBaseUrl)
          : currentBaseUrl
            ? [currentBaseUrl]
            : [];
        const nextBaseUrl = API_BASE_URL_CANDIDATES.find(
          (candidate) => !attemptedBaseUrls.includes(normalizeBaseUrl(candidate))
        );

        if (nextBaseUrl) {
          originalRequest._attemptedBaseUrls = [...attemptedBaseUrls, normalizeBaseUrl(nextBaseUrl)];
          originalRequest.baseURL = nextBaseUrl;

          return axiosInstance(originalRequest);
        }

        return Promise.reject({
          message: `Network error (${error?.code || 'UNKNOWN'}). Please check the connection between the app and server.`,
          status: 0,
        });
      }

      if (shouldLogAuthRequest(originalRequest.url || '')) {
        console.log('AUTH ERROR:', {
          method: (originalRequest.method || 'get').toUpperCase(),
          url: getFullRequestUrl(originalRequest),
          status: error.response?.status || 0,
          message: error.response?.data?.message || error.message || 'Something went wrong',
          errors: sanitizeForLog(error.response?.data?.errors || null),
          data: sanitizeForLog(error.response?.data || null),
        });
      }

      if (
        error.response.status === 401 &&
        !originalRequest._retry &&
        !shouldSkipRefresh(originalRequest.url || '')
      ) {
        originalRequest._retry = true;

        try {
          const currentBaseUrl = originalRequest.baseURL || axiosInstance.defaults.baseURL;
          const { accessToken } = await refreshAccessToken(currentBaseUrl);

          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;

          return axiosInstance(originalRequest);
        } catch (sessionError) {
          return Promise.reject(sessionError);
        }
      }

      return Promise.reject({
        message: error.response?.data?.message || 'Something went wrong',
        status: error.response?.status || 500,
        errors: error.response?.data?.errors || null,
      });
    }
  );
};
