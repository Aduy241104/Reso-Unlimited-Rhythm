import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { tokenStorage } from '../storage/tokenStorage';
import { userStorage } from '../storage/userStorage';
import authService from '../services/authService';

export const AuthContext = createContext({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    login: async () => {},
    logout: async () => {},
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

export const AuthProvider = ({ children }) => {
    const [authState, setAuthState] = useState({
        isAuthenticated: false,
        isLoading: true,
        user: null,
    });

    const restoreSession = useCallback(async () => {
        try {
            const accessToken = await tokenStorage.getAccessToken();
            const storedUser = normalizeAuthUser(await userStorage.getUserProfile());

            if (!accessToken || !storedUser) {
                setAuthState({ isAuthenticated: false, isLoading: false, user: null });
                return;
            }

            setAuthState({ isAuthenticated: true, isLoading: false, user: storedUser });

            try {
                const response = await authService.getCurrentUser();
                const freshUser = normalizeAuthUser(response?.data || response);

                if (freshUser) {
                    await userStorage.setUserProfile(freshUser);
                    setAuthState((prev) => ({ ...prev, user: freshUser }));
                }
            } catch (error) {
                if (error?.status === 401) {
                    await tokenStorage.clearTokens();
                    await userStorage.clearUserProfile();
                    setAuthState({ isAuthenticated: false, isLoading: false, user: null });
                }
            }
        } catch {
            setAuthState({ isAuthenticated: false, isLoading: false, user: null });
        }
    }, []);

    useEffect(() => {
        restoreSession();
    }, [restoreSession]);

    const login = useCallback(async (email, password) => {
        setAuthState((prev) => ({ ...prev, isLoading: true }));

        try {
            const response = await authService.login(email, password);

            if (!response) {
                throw new Error('No response received from server.');
            }

            const responseData = response?.data || response;
            const { accessToken, refreshToken, user } = responseData;
            const normalizedUser = normalizeAuthUser(user);

            if (!accessToken) {
                throw new Error(responseData?.message || 'Login failed because no access token was returned.');
            }

            await tokenStorage.setAccessToken(accessToken);

            if (refreshToken) {
                await tokenStorage.setRefreshToken(refreshToken);
            }

            if (normalizedUser) {
                await userStorage.setUserProfile(normalizedUser);
            }

            setAuthState({
                isAuthenticated: true,
                isLoading: false,
                user: normalizedUser || { email },
            });
        } catch (error) {
            setAuthState({ isAuthenticated: false, isLoading: false, user: null });
            console.log('AUTH_CONTEXT error:', error?.message || error);
            throw error;
        }
    }, []);

    const logout = useCallback(async () => {
        setAuthState((prev) => ({ ...prev, isLoading: true }));

        try {
            await authService.logout().catch(() => {});
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
