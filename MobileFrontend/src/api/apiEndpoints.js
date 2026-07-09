export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
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
    BY_GENRE: '/browse/genres',
  },
  USER_FAVORITES: {
    TRACKS: '/users/favorites/tracks',
  },
  ARTISTS: {
    DETAIL: '/browse/artists',
    TOP_MONTHLY: '/browse/artists/top/monthly',
  },
  GENRES: {
    LIST: '/browse/genres',
    DETAIL: '/browse/genres',
    TRACKS: '/browse/genres',
  },
  SEARCH: {
    ALL: '/search',
    SONGS: '/search/songs',
    ARTISTS: '/search/artists',
    ALBUMS: '/search/albums',
  },
  PLAYLISTS: {
    DETAIL: '/playlists/detail',
    SYSTEM: '/playlists/system',
    SYSTEM_DETAIL: '/playlists/system/detail',
  },
  USER_PLAYLISTS: {
    LIST: '/users/playlists',
    DETAIL: '/users/playlists/detail',
    CREATE: '/users/playlists',
    UPDATE: '/users/playlists',
    TRACKS: '/users/playlists',
  },
  PREMIUM: {
    PLANS: '/subscription-plans',
    MY_SUBSCRIPTION: '/subscriptions/me',
  },
  PAYMENTS: {
    VNPAY_CREATE_ORDER: '/payments/vnpay/create-order',
    HISTORY: '/users/payment-history',
  },
  LIBRARY: {
    FOLLOWED_ARTISTS: '/libary/followed-artists',
    FOLLOWED_ALBUMS: '/libary/followed-albums',
  },
};
