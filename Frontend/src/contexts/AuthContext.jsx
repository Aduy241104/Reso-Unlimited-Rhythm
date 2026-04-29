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

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [initialSession] = useState(() => getStoredAuthSession());
  const hasStoredSession = Boolean(
    initialSession.user && initialSession.accessToken
  );

  const [user, setUser] = useState(initialSession.user);
  const [accessToken, setAccessToken] = useState(initialSession.accessToken);
  const [isLoading, setIsLoading] = useState(!hasStoredSession);

  // Hàm này sẽ được sử dụng để xóa session khỏi state 
  // và localStorage khi logout hoặc khi refresh session thất bại
  const clearAuthState = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    clearStoredAuthSession();
  }, []);

  // Hàm này sẽ được sử dụng để áp dụng session mới nhận được từ API vào state của context
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
      getAccessToken: () => accessToken,
      onRefreshSuccess: applyAuthSession,
      onAuthFailed: logout,
    });
  }, [accessToken, applyAuthSession, logout]);

  // Khi component AuthProvider được mount, sẽ kiểm tra nếu có session 
  // đã lưu trữ thì sẽ cố gắng refresh session đó để đảm bảo tính hợp lệ
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

    initializeAuth();
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
    }),
    [user, accessToken, isLoading, login, logout, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
