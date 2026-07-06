import { tokenStorage } from '../storage/tokenStorage';
import { API_ENDPOINTS } from './apiEndpoints';
import { refreshAccessToken } from './authSession';

const shouldSkipRefresh = (requestUrl = '') =>
  [
    API_ENDPOINTS.AUTH.LOGIN,
    API_ENDPOINTS.AUTH.GOOGLE,
    API_ENDPOINTS.AUTH.REFRESH_TOKEN,
    API_ENDPOINTS.AUTH.LOGOUT,
  ].some((path) => requestUrl.includes(path));

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

  // RESPONSE INTERCEPTOR
  axiosInstance.interceptors.response.use(
    (response) => response.data,
    async (error) => {
      const originalRequest = error?.config || {};

      if (!error?.response) {
        return Promise.reject({
          message: `Network error (${error?.code || 'UNKNOWN'}). Vui lòng kiểm tra kết nối mạng giữa App và Server.`,
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
          const { accessToken } = await refreshAccessToken(axiosInstance.defaults.baseURL);

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
