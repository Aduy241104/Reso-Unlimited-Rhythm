import {
  AUTH_ACCESS_TOKEN_STORAGE_KEY,
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
  const accessToken =
    window.localStorage.getItem(AUTH_ACCESS_TOKEN_STORAGE_KEY) || null;

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
};

export const clearStoredAuthSession = () => {
  if (!isBrowser) {
    return;
  }

  window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_ACCESS_TOKEN_STORAGE_KEY);
};
