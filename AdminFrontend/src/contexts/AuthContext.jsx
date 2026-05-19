import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [isInterceptorReady, setIsInterceptorReady] = useState(false);
  const [isLoading, setIsLoading] = useState(
    !hasStoredSession || !hasUsableStoredToken
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
      try {
        const session = await refreshSessionService();
        return applyAuthSession(session);
      } catch (error) {
        if (!preserveSessionOnError) {
          clearAuthState();
        }

        throw error;
      }
    },
    [applyAuthSession, clearAuthState]
  );

  // Logout logic
  const logout = useCallback(async ({ redirectTo = "/login" } = {}) => {
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
  }, [clearAuthState, navigate]);

  // Login logic
  const login = useCallback(async (payload) => {
    const authSession = await loginService(payload);

    // thử apply vào session mới nhận được, nếu không có session data thì throw lỗi
    if (!applyAuthSession(authSession)) {
      throw new Error("Login success response missing session data.");
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
      onRefreshSuccess: applyAuthSession,
      onAuthFailed: logout,
    });

    setIsInterceptorReady(true);
  }, [applyAuthSession, logout]);

  // Khi AuthProvider mount:
  // - Nếu đang có access token local còn hạn thì dùng luôn để tránh refresh không cần thiết.
  // - Chỉ refresh khi chưa có token local hoặc token đã hết hạn/gần hết hạn.
  useEffect(() => {
    const initializeAuth = async () => {
      if (hasStoredSession) {
        if (hasUsableStoredToken) {
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
  }, [hasStoredSession, hasUsableStoredToken, refreshSession]);

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
    }),
    [user, accessToken, isLoading, login, logout, refreshSession]
  );

  return (
    <AuthContext.Provider value={ value }>
      { isInterceptorReady ? children : null }
    </AuthContext.Provider>
  );
};
