import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { tokenStorage } from '../storage/tokenStorage';
import { userStorage } from '../storage/userStorage';
import authService from '../services/authService';

export const AuthContext = createContext({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    login: async (email, password) => { },
    logout: async () => { },
});

export const AuthProvider = ({ children }) => {
    const [authState, setAuthState] = useState({
        isAuthenticated: false,
        isLoading: true,
        user: null,
    });

    // Tự động khôi phục phiên làm việc cũ khi mở lại ứng dụng (Persist Session)
    const restoreSession = useCallback(async () => {
        try {
            const accessToken = await tokenStorage.getAccessToken();
            const storedUser = await userStorage.getUserProfile();

            if (accessToken && storedUser) {
                // Gán trạng thái tạm thời để user vào thẳng màn chính mà không bị đứng ở màn Login
                setAuthState({ isAuthenticated: true, isLoading: false, user: storedUser });

                try {
                    // Thực hiện đồng bộ ngầm dữ liệu mới nhất từ router /auth/me của Backend
                    const response = await authService.getCurrentUser();

                    // Khớp cấu trúc dữ liệu thô trả về từ controller me của Backend
                    const freshUser = response.data || response;
                    await userStorage.setUserProfile(freshUser);
                    setAuthState((prev) => ({ ...prev, user: freshUser }));
                } catch (e) {
                    if (e.status === 401) {
                        await tokenStorage.clearTokens();
                        await userStorage.clearUserProfile();
                        setAuthState({ isAuthenticated: false, isLoading: false, user: null });
                    }
                }
            } else {
                setAuthState({ isAuthenticated: false, isLoading: false, user: null });
            }
        } catch {
            setAuthState({ isAuthenticated: false, isLoading: false, user: null });
        }
    }, []);

    useEffect(() => {
        restoreSession();
    }, [restoreSession]);

    // Hàm xử lý hành vi đăng nhập nối thẳng tới Backend API
    // Hàm xử lý hành vi đăng nhập nối thẳng tới Backend API
    const login = useCallback(async (email, password) => {
        setAuthState((prev) => ({ ...prev, isLoading: true }));
        try {
            const response = await authService.login(email, password);

            // An toàn: Kiểm tra xem response có thực sự tồn tại không
            if (!response) {
                throw new Error("Không nhận được phản hồi từ server.");
            }

            // Đọc trực tiếp dữ liệu thô vì interceptor đã gọt vỏ response.data rồi
            const responseData = response.data ? response.data : response;
            const { accessToken, refreshToken, user } = responseData;

            // Kiểm tra nghiêm ngặt xem có token thật không, tránh crash khi destructuring
            if (!accessToken) {
                throw new Error(responseData?.message || "Đăng nhập thất bại: Server không trả về Token.");
            }

            // Lưu trữ thông tin định danh cục bộ bảo mật
            await tokenStorage.setAccessToken(accessToken);
            if (refreshToken) {
                await tokenStorage.setRefreshToken(refreshToken);
            }
            if (user) {
                await userStorage.setUserProfile(user);
            }

            setAuthState({
                isAuthenticated: true,
                isLoading: false,
                user: user || { email },
            });

        } catch (error) {
            setAuthState({ isAuthenticated: false, isLoading: false, user: null });

            // 🚀 Log lỗi thực tế ra đây để bạn nhìn thấy trên Terminal:
            console.log("❌ LỖI THỰC TẾ TẠI AUTH_CONTEXT:", error.message || error);

            throw error;
        }
    }, []);

    // Hàm xử lý đăng xuất đồng bộ
    const logout = useCallback(async () => {
        setAuthState((prev) => ({ ...prev, isLoading: true }));
        try {
            await authService.logout().catch(() => { });
        } finally {
            await tokenStorage.clearTokens();
            await userStorage.clearUserProfile();
            setAuthState({
                isAuthenticated: false,
                isLoading: false,
                user: null,
            });
        }
    }, []);

    const contextValue = useMemo(() => ({
        ...authState,
        login,
        logout,
    }), [authState, login, logout]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};