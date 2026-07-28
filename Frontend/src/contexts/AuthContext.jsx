import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { setupAxiosInterceptors } from "../axios/setupAuthInterceptors";
import {
  cancelRefreshSessionService,
  googleLoginService,
  loginService,
  logoutService,
  refreshSessionService,
} from "../services/authService";
import {
  clearStoredAuthSession,
  getStoredAuthSession,
  hasStoredLogoutIntent,
  persistAuthSession,
  persistLogoutIntent,
} from "../services/authStorage";
import { getCurrentUserProfile } from "../services/userProfileService";
import { routePaths } from "../routes/routePaths";
import AuthContext from "./auth-context";

const TOKEN_REFRESH_BUFFER_IN_SECONDS = 30;

const decodeJwtPayload = (token) => {
  if (!token || typeof token !== "string") {
    return null;
  }

  const [, payload] = token.split(".");

  if (!payload) {
    return null;
  }

  try {
    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      "="
    );
    const decodedPayload = window.atob(paddedPayload);

    return JSON.parse(decodedPayload);
  } catch {
    return null;
  }
};

const isAccessTokenStillValid = (token) => {
  if (!token) {
    return false;
  }

  const payload = decodeJwtPayload(token);
  const expiresAtInSeconds = Number(payload?.exp);

  if (!Number.isFinite(expiresAtInSeconds)) {
    return true;
  }

  const currentTimeInSeconds = Math.floor(Date.now() / 1000);

  return (
    expiresAtInSeconds - currentTimeInSeconds >
    TOKEN_REFRESH_BUFFER_IN_SECONDS
  );
};

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [initialSession] = useState(() => getStoredAuthSession());
  const [hasInitialLogoutIntent] = useState(() => hasStoredLogoutIntent());
  const hasStoredSession = Boolean(
    initialSession.user && initialSession.accessToken
  );
  const hasUsableStoredToken = isAccessTokenStillValid(
    initialSession.accessToken
  );

  const [user, setUser] = useState(initialSession.user);
  const [accessToken, setAccessToken] = useState(initialSession.accessToken);
  const userRef = useRef(initialSession.user);
  const accessTokenRef = useRef(initialSession.accessToken);
  const isLoggingOutRef = useRef(hasInitialLogoutIntent);
  const authSessionVersionRef = useRef(0);
  const [isInterceptorReady, setIsInterceptorReady] = useState(false);
  const [isLoading, setIsLoading] = useState(
    !hasInitialLogoutIntent && (!hasStoredSession || !hasUsableStoredToken)
  );

  // Hàm này sẽ được sử dụng để xóa session khỏi state 
  // và localStorage khi logout hoặc khi refresh session thất bại
  const clearAuthState = useCallback(() => {
    userRef.current = null;
    accessTokenRef.current = null;
    setUser(null);
    setAccessToken(null);
    clearStoredAuthSession();
  }, []);

  // Hàm này sẽ được sử dụng để áp dụng session mới nhận được từ API vào state của context
  const applyAuthSession = useCallback(
    (session) => {
      const storedSession = getStoredAuthSession();
      const sessionUser =
        session?.user ?? userRef.current ?? storedSession.user ?? null;
      const sessionToken =
        session?.accessToken ??
        accessTokenRef.current ??
        storedSession.accessToken ??
        null;

      if (!sessionUser || !sessionToken) {
        clearAuthState();
        return null;
      }

      userRef.current = sessionUser;
      accessTokenRef.current = sessionToken;
      setUser(sessionUser);
      setAccessToken(sessionToken);
      persistAuthSession({
        user: sessionUser,
        accessToken: sessionToken,
      });

      return {
        ...session,
        user: sessionUser,
        accessToken: sessionToken,
      };
    },
    [clearAuthState]
  );

  // Refresh session logic, có option preserveSessionOnError 
  // để quyết định có nên clear auth state nếu refresh thất bại hay không
  const refreshSession = useCallback(
    async ({ preserveSessionOnError = false } = {}) => {
      if (isLoggingOutRef.current) {
        return null;
      }

      const sessionVersion = authSessionVersionRef.current;

      try {
        const session = await refreshSessionService();

        if (
          isLoggingOutRef.current ||
          sessionVersion !== authSessionVersionRef.current
        ) {
          return null;
        }

        return applyAuthSession(session);
      } catch (error) {
        if (
          !preserveSessionOnError &&
          !isLoggingOutRef.current &&
          sessionVersion === authSessionVersionRef.current
        ) {
          clearAuthState();
        }

        throw error;
      }
    },
    [applyAuthSession, clearAuthState]
  );

  const refreshCurrentUser = useCallback(async () => {
    const latestUser = await getCurrentUserProfile();

    if (!latestUser) {
      throw new Error("Current user profile response missing user data.");
    }

    return applyAuthSession({ user: latestUser })?.user ?? latestUser;
  }, [applyAuthSession]);

  // Logout logic
  const logout = useCallback(async ({ redirectTo = routePaths.home } = {}) => {
    isLoggingOutRef.current = true;
    authSessionVersionRef.current += 1;
    persistLogoutIntent();
    clearAuthState();
    cancelRefreshSessionService();

    try {
      await logoutService();
    } catch {
      // Local logout remains authoritative even if the API is unavailable.
    } finally {
      if (redirectTo) {
        navigate(redirectTo, { replace: true });
      }
    }
  }, [clearAuthState, navigate]);

  // Login logic
  const login = useCallback(async (payload) => {
    const authSession = await loginService(payload);

    isLoggingOutRef.current = false;
    authSessionVersionRef.current += 1;

    // thử apply vào session mới nhận được, nếu không có session data thì throw lỗi
    if (!applyAuthSession(authSession)) {
      throw new Error("Login success response missing session data.");
    }

    return authSession;
  }, [applyAuthSession]);

  const googleLogin = useCallback(async (token) => {
    const authSession = await googleLoginService(token);

    isLoggingOutRef.current = false;
    authSessionVersionRef.current += 1;

    if (!applyAuthSession(authSession)) {
      throw new Error("Google login success response missing session data.");
    }

    return authSession;
  }, [applyAuthSession]);

  // Đồng bộ session vào localStorage mỗi khi có sự thay đổi về user hoặc accessToken
  useEffect(() => {
    userRef.current = user;
    accessTokenRef.current = accessToken;

    if (user && accessToken) {
      persistAuthSession({ user, accessToken });
      return;
    }

    clearStoredAuthSession();
  }, [user, accessToken]);

  // Thiết lập interceptor cho axios để tự động thêm access token vào header và xử lý lỗi xác thực
  // Cấu hình interceptor sẽ được cập nhật mỗi khi accessToken, applyAuthSession hoặc logout thay đổi
  useEffect(() => {
    setupAxiosInterceptors({
      getAccessToken: () => accessTokenRef.current,
      shouldRefreshSession: () =>
        !isLoggingOutRef.current && Boolean(accessTokenRef.current),
      onRefreshSuccess: (session) => {
        if (isLoggingOutRef.current || !accessTokenRef.current) {
          return null;
        }

        return applyAuthSession(session);
      },
      onAuthFailed: logout,
    });

    setIsInterceptorReady(true);
  }, [applyAuthSession, logout]);

  // Khi AuthProvider mount:
  // - Nếu đang có access token local còn hạn thì dùng luôn để tránh refresh không cần thiết.
  // - Chỉ refresh khi chưa có token local hoặc token đã hết hạn/gần hết hạn.
  useEffect(() => {
    const initializeAuth = async () => {
      if (hasInitialLogoutIntent) {
        setIsLoading(false);
        return;
      }

      if (hasStoredSession) {
        if (hasUsableStoredToken) {
          try {
            await refreshCurrentUser();
          } catch {
            // Keep the stored session if fetching the latest profile fails.
          }

          setIsLoading(false);
          return;
        }

        try {
          await refreshSession();
        } catch {
          return;
        } finally {
          setIsLoading(false);
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

    initializeAuth();
  }, [
    hasInitialLogoutIntent,
    hasStoredSession,
    hasUsableStoredToken,
    refreshCurrentUser,
    refreshSession,
  ]);

  useEffect(() => {
    if (!user || !accessToken) {
      return undefined;
    }

    const syncCurrentUser = () => {
      refreshCurrentUser().catch(() => {
        // Ignore sync failures and keep the current in-memory session.
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncCurrentUser();
      }
    };

    window.addEventListener("focus", syncCurrentUser);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", syncCurrentUser);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [accessToken, refreshCurrentUser, user]);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      googleLogin,
      logout,
      refreshSession,
      refreshCurrentUser,
      setUser,
      setAccessToken,
    }),
    [
      user,
      accessToken,
      isLoading,
      login,
      googleLogin,
      logout,
      refreshSession,
      refreshCurrentUser,
    ]
  );

  return (
    <AuthContext.Provider value={ value }>
      { isInterceptorReady ? children : null }
    </AuthContext.Provider>
  );
};
