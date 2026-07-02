export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REFRESH_TOKEN: '/auth/refresh-token',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
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
};
