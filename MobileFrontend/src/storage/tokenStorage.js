import * as SecureStore from 'expo-secure-store';

// 🚀 ĐẶT CỨNG TÊN KEY LÀ CHUỖI SẠCH: Không chứa khoảng trắng, không chứa @, không chứa &
const COMPACT_ACCESS_TOKEN_KEY = "reso_user_access_token";
const COMPACT_REFRESH_TOKEN_KEY = "reso_user_refresh_token";

export const tokenStorage = {
  async setAccessToken(token) {
    if (!token || typeof token !== 'string') return;
    // Dùng tên Key cố định sạch sẽ, không truyền biến động chứa ký tự lạ vào đây
    await SecureStore.setItemAsync(COMPACT_ACCESS_TOKEN_KEY, token);
  },

  async getAccessToken() {
    return await SecureStore.getItemAsync(COMPACT_ACCESS_TOKEN_KEY);
  },

  async setRefreshToken(token) {
    if (!token || typeof token !== 'string') return;
    await SecureStore.setItemAsync(COMPACT_REFRESH_TOKEN_KEY, token);
  },

  async getRefreshToken() {
    return await SecureStore.getItemAsync(COMPACT_REFRESH_TOKEN_KEY);
  },

  async clearTokens() {
    await SecureStore.deleteItemAsync(COMPACT_ACCESS_TOKEN_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(COMPACT_REFRESH_TOKEN_KEY).catch(() => {});
  }
};