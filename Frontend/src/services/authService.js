import axiosClient from "../axios/axiosClient";
import { AUTH_API_PREFIX } from "../constants/auth";

const getAuthPayload = (response) => response?.data?.data ?? null;
const getApiEnvelope = (response) => response?.data ?? null;
let refreshSessionPromise = null;

const normalizeAuthSession = (response) => {
  const payload = getAuthPayload(response);

  return {
    ...payload,
    user: payload?.user ?? null,
    accessToken: payload?.accessToken ?? null,
  };
};

export const loginService = async (payload) => {
  const response = await axiosClient.post(`${AUTH_API_PREFIX}/login`, payload);
  return normalizeAuthSession(response);
};

export const requestRegisterOtpService = async (payload) => {
  const response = await axiosClient.post(
    `${AUTH_API_PREFIX}/register/send-otp`,
    payload
  );

  return getAuthPayload(response);
};

export const registerService = async (payload) => {
  const response = await axiosClient.post(`${AUTH_API_PREFIX}/register`, payload);
  return getAuthPayload(response);
};

export const forgotPasswordService = async (payload) => {
  const response = await axiosClient.post(
    `${AUTH_API_PREFIX}/forgot-password`,
    payload
  );

  return getApiEnvelope(response);
};

export const resetPasswordService = async (payload) => {
  const response = await axiosClient.post(
    `${AUTH_API_PREFIX}/reset-password`,
    payload
  );

  return getApiEnvelope(response);
};

export const refreshSessionService = async () => {
  if (!refreshSessionPromise) {
    refreshSessionPromise = axiosClient
      .post(`${AUTH_API_PREFIX}/refresh-token`)
      .then((response) => normalizeAuthSession(response))
      .finally(() => {
        refreshSessionPromise = null;
      });
  }

  return refreshSessionPromise;
};

export const logoutService = async () => {
  return axiosClient.post(`${AUTH_API_PREFIX}/logout`);
};

export const testAccessTokenService = async () => {
  const response = await axiosClient.get(`${AUTH_API_PREFIX}/me`);
  console.log("testAccessTokenService response:", response);

  return response?.data ?? null;
};
