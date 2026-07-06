export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REGISTER_SEND_OTP: '/auth/register/send-otp',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    REFRESH_TOKEN: '/auth/refresh-token',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
  },
  ALBUMS: {
    LIST: '/albums',
    DETAIL: '/albums',
    FOLLOW_STATUS: '/albums',
    TOGGLE_FOLLOW: '/albums',
  },
  TRACKS: {
    DETAIL: '/tracks',
    PLAYBACK: '/tracks',
    TOP_DAILY: '/tracks/top/daily',
    TOP_MONTHLY: '/tracks/top/monthly',
  },
  ARTISTS: {
    DETAIL: '/browse/artists',
    TOP_MONTHLY: '/browse/artists/top/monthly',
  },
  PLAYLISTS: {
    DETAIL: '/playlists/detail',
    SYSTEM: '/playlists/system',
    SYSTEM_DETAIL: '/playlists/system/detail',
  },
  PREMIUM: {
    PLANS: '/subscription-plans',
    MY_SUBSCRIPTION: '/subscriptions/me',
  },
  PAYMENTS: {
    VNPAY_CREATE_ORDER: '/payments/vnpay/create-order',
  },
  LIBRARY: {
    FOLLOWED_ALBUMS: '/libary/followed-albums',
  },
};
