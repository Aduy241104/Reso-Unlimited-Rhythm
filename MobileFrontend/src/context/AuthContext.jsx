import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { normalizeAuthPayload, setSessionExpiredHandler } from '../api/authSession';
import { tokenStorage } from '../storage/tokenStorage';
import { userStorage } from '../storage/userStorage';
import authService from '../services/authService';

const emptyAuthState = {
  isAuthenticated: false,
  isLoading: false,
  user: null,
};

export const AuthContext = createContext({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  login: async () => {},
  logout: async () => {},
  updateUser: async () => {},
});

const normalizeAuthUser = (value) => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  if (value.user && typeof value.user === 'object') {
    return value.user;
  }

  return value;
};

const mergeAuthUsers = (primaryUser = null, secondaryUser = null) => {
  const preferredUser = normalizeAuthUser(primaryUser);
  const fallbackUser = normalizeAuthUser(secondaryUser);

  if (!preferredUser && !fallbackUser) {
    return null;
  }

  return {
    ...(fallbackUser || {}),
    ...(preferredUser || {}),
    profile: {
      ...(fallbackUser?.profile || {}),
      ...(preferredUser?.profile || {}),
    },
  };
};

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    isLoading: true,
    user: null,
  });

  const clearSession = useCallback(async () => {
    await tokenStorage.clearTokens().catch(() => {});
    await userStorage.clearUserProfile().catch(() => {});
    setAuthState(emptyAuthState);
  }, []);

  const persistSession = useCallback(async ({ accessToken, refreshToken, user }) => {
    if (accessToken) {
      await tokenStorage.setAccessToken(accessToken);
    }

    if (refreshToken) {
      await tokenStorage.setRefreshToken(refreshToken);
    }

    const normalizedUser = normalizeAuthUser(user);

    if (normalizedUser) {
      await userStorage.setUserProfile(normalizedUser);
    }
  }, []);

  const syncCurrentUser = useCallback(async (fallbackUser = null) => {
    const response = await authService.getCurrentUser();
    const freshUser = normalizeAuthUser(response?.data || response);
    const mergedUser = mergeAuthUsers(freshUser, fallbackUser);

    if (mergedUser) {
      await userStorage.setUserProfile(mergedUser);
      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        user: mergedUser,
      });
      return mergedUser;
    }

    setAuthState({
      isAuthenticated: true,
      isLoading: false,
      user: fallbackUser,
    });

    return fallbackUser;
  }, []);

  const restoreSession = useCallback(async () => {
    let storedUser = null;
    let hasStoredSession = false;

    try {
      const [accessToken, refreshToken, persistedUser] = await Promise.all([
        tokenStorage.getAccessToken(),
        tokenStorage.getRefreshToken(),
        userStorage.getUserProfile(),
      ]);

      storedUser = normalizeAuthUser(persistedUser);
      hasStoredSession = Boolean(accessToken || refreshToken);

      if (!hasStoredSession) {
        setAuthState(emptyAuthState);
        return;
      }

      if (storedUser) {
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          user: storedUser,
        });
      }

      await syncCurrentUser(storedUser);
    } catch (error) {
      if (error?.status === 401) {
        await clearSession();
        return;
      }

      setAuthState({
        isAuthenticated: hasStoredSession || Boolean(storedUser),
        isLoading: false,
        user: storedUser,
      });
    }
  }, [clearSession, syncCurrentUser]);

  useEffect(() => {
    setSessionExpiredHandler(clearSession);

    return () => {
      setSessionExpiredHandler(null);
    };
  }, [clearSession]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = useCallback(
    async (email, password) => {
      setAuthState((prev) => ({ ...prev, isLoading: true }));

      try {
        const response = await authService.login(email, password);

        if (!response) {
          throw new Error('Khong nhan duoc phan hoi tu server.');
        }

        const authPayload = normalizeAuthPayload(response?.data || response);
        const sessionUser = normalizeAuthUser(authPayload.user) || { email };

        if (!authPayload.accessToken) {
          throw new Error('Dang nhap that bai: Server khong tra ve access token.');
        }

        await persistSession({
          accessToken: authPayload.accessToken,
          refreshToken: authPayload.refreshToken,
          user: sessionUser,
        });

        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          user: sessionUser,
        });

        try {
          await syncCurrentUser(sessionUser);
        } catch (syncError) {
          if (syncError?.status === 401) {
            throw syncError;
          }
        }
      } catch (error) {
        await clearSession();
        console.log('Auth error:', error?.message || error);
        throw error;
      }
    },
    [clearSession, persistSession, syncCurrentUser]
  );

  const logout = useCallback(async () => {
    setAuthState((prev) => ({ ...prev, isLoading: true }));

    try {
      await authService.logout().catch(() => {});
    } finally {
      await clearSession();
    }
  }, [clearSession]);

  const updateUser = useCallback(
    async (nextUser) => {
      const mergedUser = mergeAuthUsers(nextUser, authState.user);

      if (!mergedUser) {
        return null;
      }

      await userStorage.setUserProfile(mergedUser).catch(() => {});
      setAuthState((prev) => ({
        ...prev,
        isAuthenticated: true,
        isLoading: false,
        user: mergedUser,
      }));

      return mergedUser;
    },
    [authState.user]
  );

  const contextValue = useMemo(
    () => ({
      ...authState,
      login,
      logout,
      updateUser,
    }),
    [authState, login, logout, updateUser]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};
