import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { setupAxiosInterceptors } from "../axios/setupAuthInterceptors";
import {
  loginService,
  logoutService,
  refreshSessionService,
} from "../services/authService";
import {
  clearStoredAuthSession,
  getStoredAuthSession,
  persistAuthSession,
} from "../services/authStorage";
import AuthContext from "./auth-context";

const ADMIN_ACCESS_ERROR_MESSAGE =
  "This account cannot access the admin area.";

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [initialSession] = useState(() => getStoredAuthSession());
  const hasStoredSession = Boolean(
    initialSession.user && initialSession.accessToken
  );

  const [user, setUser] = useState(initialSession.user);
  const [accessToken, setAccessToken] = useState(initialSession.accessToken);
  const [isLoading, setIsLoading] = useState(!hasStoredSession);

  const clearAuthState = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    clearStoredAuthSession();
  }, []);

  const assertAdminSession = useCallback((session) => {
    const sessionUser = session?.user ?? null;
    const sessionToken = session?.accessToken ?? null;

    if (!sessionUser || !sessionToken) {
      throw new Error("Missing valid session data.");
    }

    if (sessionUser.role !== "admin") {
      throw new Error(ADMIN_ACCESS_ERROR_MESSAGE);
    }
  }, []);

  const applyAuthSession = useCallback(
    (session) => {
      const sessionUser = session?.user ?? null;
      const sessionToken = session?.accessToken ?? null;

      if (!sessionUser || !sessionToken) {
        clearAuthState();
        return null;
      }

      setUser(sessionUser);
      setAccessToken(sessionToken);

      return session;
    },
    [clearAuthState]
  );

  const refreshSession = useCallback(
    async ({ preserveSessionOnError = false } = {}) => {
      try {
        const session = await refreshSessionService();
        assertAdminSession(session);
        return applyAuthSession(session);
      } catch (error) {
        if (error?.message === ADMIN_ACCESS_ERROR_MESSAGE) {
          try {
            await logoutService();
          } catch {
            // Ignore logout failures when clearing an invalid admin session.
          }
        }

        if (
          !preserveSessionOnError ||
          error?.message === ADMIN_ACCESS_ERROR_MESSAGE
        ) {
          clearAuthState();
        }

        throw error;
      }
    },
    [applyAuthSession, assertAdminSession, clearAuthState]
  );

  const logout = useCallback(
    async ({ redirectTo = "/login" } = {}) => {
      try {
        await logoutService();
      } catch {
        // Ignore API failure, still clear local auth state.
      } finally {
        clearAuthState();
        if (redirectTo) {
          navigate(redirectTo, { replace: true });
        }
      }
    },
    [clearAuthState, navigate]
  );

  const login = useCallback(
    async (payload) => {
      try {
        const authSession = await loginService(payload);
        assertAdminSession(authSession);

        if (!applyAuthSession(authSession)) {
          throw new Error("Login success response missing session data.");
        }

        return authSession;
      } catch (error) {
        if (error?.message === ADMIN_ACCESS_ERROR_MESSAGE) {
          try {
            await logoutService();
          } catch {
            // Ignore logout failures for non-admin logins.
          }
        }

        clearAuthState();
        throw error;
      }
    },
    [applyAuthSession, assertAdminSession, clearAuthState]
  );

  useEffect(() => {
    if (user && accessToken) {
      persistAuthSession({ user, accessToken });
      return;
    }

    clearStoredAuthSession();
  }, [user, accessToken]);

  useEffect(() => {
    setupAxiosInterceptors({
      getAccessToken: () => accessToken,
      onRefreshSuccess: (session) => {
        assertAdminSession(session);
        applyAuthSession(session);
      },
      onAuthFailed: logout,
    });
  }, [accessToken, applyAuthSession, assertAdminSession, logout]);

  useEffect(() => {
    const initializeAuth = async () => {
      if (hasStoredSession) {
        setIsLoading(false);

        try {
          await refreshSession({ preserveSessionOnError: true });
        } catch {
          return;
        }

        return;
      }

      try {
        await refreshSession();
      } catch {
        return;
      } finally {
        setIsLoading(false);
      }
    };

    void initializeAuth();
  }, [hasStoredSession, refreshSession]);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      logout,
      refreshSession,
      setUser,
      setAccessToken,
      clearAuthState,
    }),
    [
      user,
      accessToken,
      isLoading,
      login,
      logout,
      refreshSession,
      clearAuthState,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
