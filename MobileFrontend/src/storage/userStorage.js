import * as SecureStore from 'expo-secure-store';

const COMPACT_USER_PROFILE_KEY = "reso_user_profile_data";

export const userStorage = {
  async setUserProfile(user) {
    if (!user) return;
    const userString = typeof user === 'object' ? JSON.stringify(user) : user;
    // Bắt buộc dùng biến cố định này làm Key, không lấy user.email làm Key nữa!
    await SecureStore.setItemAsync(COMPACT_USER_PROFILE_KEY, userString);
  },

  async getUserProfile() {
    const userString = await SecureStore.getItemAsync(COMPACT_USER_PROFILE_KEY);
    try {
      return userString ? JSON.parse(userString) : null;
    } catch {
      return null;
    }
  },

  async clearUserProfile() {
    await SecureStore.deleteItemAsync(COMPACT_USER_PROFILE_KEY).catch(() => {});
  }
};