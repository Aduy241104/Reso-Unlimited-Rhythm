import axiosClient from "./axiosClient";
import { AUTH_API_PREFIX } from "../constants/auth";
import { refreshSessionService } from "../services/authService";
import { getStoredAccessToken } from "../services/authStorage";

let isRefreshing = false;
let failedQueue = [];
let requestInterceptorId = null;
let responseInterceptorId = null;

const applyAuthorizationHeader = (headers, token) => {
  if (!headers) {
    return;
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
    return;
  }

  delete headers.Authorization;
};

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
      return;
    }

    resolve(token);
  });

  failedQueue = [];
};

export const setupAxiosInterceptors = ({
  getAccessToken,
  onRefreshSuccess,
  onAuthFailed,
}) => {
  if (requestInterceptorId !== null) {
    axiosClient.interceptors.request.eject(requestInterceptorId);
  }

  if (responseInterceptorId !== null) {
    axiosClient.interceptors.response.eject(responseInterceptorId);
  }

  requestInterceptorId = axiosClient.interceptors.request.use(
    (config) => {
      const token = getStoredAccessToken() ?? getAccessToken?.();

      config.headers = config.headers || {};
      applyAuthorizationHeader(config.headers, token);

      return config;
    },
    (error) => Promise.reject(error)
  );

  responseInterceptorId = axiosClient.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      const status = error?.response?.status;
      const url = originalRequest?.url || "";

      if (!originalRequest || status !== 401) {
        return Promise.reject(error);
      }

      const isRefreshRequest = url.includes(`${AUTH_API_PREFIX}/refresh-token`);
      const isNonRefreshableAuthRequest =
        url.includes(`${AUTH_API_PREFIX}/login`) ||
        url.includes(`${AUTH_API_PREFIX}/register`) ||
        url.includes(`${AUTH_API_PREFIX}/logout`);

      if (isNonRefreshableAuthRequest) {
        return Promise.reject(error);
      }

      if (isRefreshRequest || originalRequest._retry) {
        onAuthFailed?.();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers = originalRequest.headers || {};
            applyAuthorizationHeader(originalRequest.headers, newToken);
            return axiosClient(originalRequest);
          })
          .catch((queueError) => Promise.reject(queueError));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshedSession = await refreshSessionService();
        const newAccessToken = refreshedSession?.accessToken;

        if (!newAccessToken) {
          throw new Error("No access token returned from refresh endpoint.");
        }

        onRefreshSuccess?.(refreshedSession);
        processQueue(null, newAccessToken);

        originalRequest.headers = originalRequest.headers || {};
        applyAuthorizationHeader(originalRequest.headers, newAccessToken);

        return axiosClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        onAuthFailed?.();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
  );
};
