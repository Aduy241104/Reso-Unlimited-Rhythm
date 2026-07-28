import {
  AUTH_ACCESS_TOKEN_STORAGE_KEY,
  AUTH_LOGOUT_INTENT_STORAGE_KEY,
  AUTH_USER_STORAGE_KEY,
} from "../constants/auth";

const isBrowser = typeof window !== "undefined";

const parseStoredUser = (rawUser) => {
  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch {
    return null;
  }
};

export const getStoredAccessToken = () => {
  if (!isBrowser) {
    return null;
  }

  return window.localStorage.getItem(AUTH_ACCESS_TOKEN_STORAGE_KEY) || null;
};

export const getStoredAuthSession = () => {
  if (!isBrowser) {
    return {
      user: null,
      accessToken: null,
    };
  }

  const user = parseStoredUser(
    window.localStorage.getItem(AUTH_USER_STORAGE_KEY)
  );
  const accessToken = getStoredAccessToken();

  if (!user || !accessToken) {
    return {
      user: null,
      accessToken: null,
    };
  }

  return {
    user,
    accessToken,
  };
};

export const persistAuthSession = ({ user, accessToken }) => {
  if (!isBrowser || !user || !accessToken) {
    return;
  }

  window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
  window.localStorage.setItem(AUTH_ACCESS_TOKEN_STORAGE_KEY, accessToken);
  window.localStorage.removeItem(AUTH_LOGOUT_INTENT_STORAGE_KEY);
};

export const hasStoredLogoutIntent = () => {
  if (!isBrowser) {
    return false;
  }

  return window.localStorage.getItem(AUTH_LOGOUT_INTENT_STORAGE_KEY) === "true";
};

export const persistLogoutIntent = () => {
  if (!isBrowser) {
    return;
  }

  window.localStorage.setItem(AUTH_LOGOUT_INTENT_STORAGE_KEY, "true");
};

export const clearStoredAuthSession = () => {
  if (!isBrowser) {
    return;
  }

  window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_ACCESS_TOKEN_STORAGE_KEY);
};
