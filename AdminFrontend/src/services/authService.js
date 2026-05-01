import axiosClient from "../axios/axiosClient";
import { AUTH_API_PREFIX } from "../constants/auth";

const getAuthPayload = (response) => response?.data?.data ?? null;

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

export const refreshSessionService = async () => {
  const response = await axiosClient.post(`${AUTH_API_PREFIX}/refresh-token`);
  return normalizeAuthSession(response);
};

export const logoutService = async () => {
  return axiosClient.post(`${AUTH_API_PREFIX}/logout`);
};

export const getCurrentUserService = async () => {
  const response = await axiosClient.get(`${AUTH_API_PREFIX}/me`);
  return response?.data?.data ?? null;
};
