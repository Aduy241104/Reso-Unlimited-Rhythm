import { tokenStorage } from '../storage/tokenStorage';
import { API_BASE_URL_CANDIDATES, setApiBaseUrl } from '../config/api';
import { refreshAccessToken } from './authSession';
import { API_ENDPOINTS } from './apiEndpoints';

const shouldSkipRefresh = (requestUrl = '') =>
  [
    API_ENDPOINTS.AUTH.LOGIN,
    API_ENDPOINTS.AUTH.REFRESH_TOKEN,
    API_ENDPOINTS.AUTH.LOGOUT,
  ].some((path) => requestUrl.includes(path));

const normalizeBaseUrl = (value = '') => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().replace(/\/+$/, '');
};

export const setupInterceptors = (axiosInstance) => {
  axiosInstance.interceptors.request.use(
    async (config) => {
      try {
        const tokenPromise = tokenStorage.getAccessToken();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('SecureStore Timeout')), 2000)
        );

        const token = await Promise.race([tokenPromise, timeoutPromise]).catch(() => null);

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
