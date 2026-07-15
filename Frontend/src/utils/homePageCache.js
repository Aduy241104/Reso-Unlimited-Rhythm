import {
  DAILY_TOP_TRACK_LIMIT,
  getPreviousDateValue,
} from "./dailyTopTracks";
import {
  MONTHLY_TOP_TRACK_LIMIT,
  getCurrentMonthValue,
} from "./monthlyTopTracks";
import { MONTHLY_TOP_ARTISTS_LIMIT } from "./monthlyTopArtists";

const homePageCache = {
  albums: null,
  systemPlaylists: null,
  dailyTopTracks: null,
  monthlyTopTracks: null,
  monthlyTopArtists: null,
  dailyTopArtists: null,
};

export const DAILY_TOP_ARTISTS_DATE = "2026-06-01";
export const DAILY_TOP_ARTISTS_LIMIT = 9;
export const DAILY_TOP_TRACKS_DATE = getPreviousDateValue();
export const MONTHLY_TOP_TRACKS_DATE = getCurrentMonthValue();
export const MONTHLY_TOP_ARTISTS_DATE = getCurrentMonthValue();
export const ALBUMS_CACHE_KEY = "albums:10";
export const SYSTEM_PLAYLISTS_CACHE_KEY = "system-playlists:10";
export const DAILY_TOP_TRACKS_CACHE_KEY =
  `daily-top-tracks:${DAILY_TOP_TRACKS_DATE}:${DAILY_TOP_TRACK_LIMIT}`;
export const MONTHLY_TOP_TRACKS_CACHE_KEY =
  `monthly-top-tracks:${MONTHLY_TOP_TRACKS_DATE}:${MONTHLY_TOP_TRACK_LIMIT}`;
export const MONTHLY_TOP_ARTISTS_CACHE_KEY =
  `monthly-top-artists:${MONTHLY_TOP_ARTISTS_DATE}:${MONTHLY_TOP_ARTISTS_LIMIT}`;
export const DAILY_TOP_ARTISTS_CACHE_KEY =
  `daily-top-artists:${DAILY_TOP_ARTISTS_DATE}:${DAILY_TOP_ARTISTS_LIMIT}`;

export const getCachedHomeSection = (sectionName, cacheKey) => {
  const cacheEntry = homePageCache[sectionName];

  if (!cacheEntry || cacheEntry.key !== cacheKey) {
    return null;
  }

  return cacheEntry.value;
};

export const setCachedHomeSection = (sectionName, cacheKey, value) => {
  homePageCache[sectionName] = {
    key: cacheKey,
    value,
  };
};

export const getHomePageCachedSections = () => ({
  cachedAlbums: getCachedHomeSection("albums", ALBUMS_CACHE_KEY),
  cachedSystemPlaylists: getCachedHomeSection(
    "systemPlaylists",
    SYSTEM_PLAYLISTS_CACHE_KEY
  ),
  cachedDailyTopTracks: getCachedHomeSection(
    "dailyTopTracks",
    DAILY_TOP_TRACKS_CACHE_KEY
  ),
  cachedMonthlyTopTracks: getCachedHomeSection(
    "monthlyTopTracks",
    MONTHLY_TOP_TRACKS_CACHE_KEY
  ),
  cachedMonthlyTopArtists: getCachedHomeSection(
    "monthlyTopArtists",
    MONTHLY_TOP_ARTISTS_CACHE_KEY
  ),
  cachedDailyTopArtists: getCachedHomeSection(
    "dailyTopArtists",
    DAILY_TOP_ARTISTS_CACHE_KEY
  ),
});
