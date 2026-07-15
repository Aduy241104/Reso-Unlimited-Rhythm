import { useEffect, useState } from "react";
import { getAlbumsService } from "../services/albumService";
import {
  getDailyTopArtistsService,
  getMonthlyTopArtistsService,
} from "../services/artistBrowseService";
import { getSystemPlaylistsService } from "../services/playlistService";
import {
  getDailyTopTracksService,
  getMonthlyTopTracksService,
} from "../services/trackService";
import { getApiErrorMessage } from "../utils/apiError";
import { DAILY_TOP_TRACK_LIMIT } from "../utils/dailyTopTracks";
import { MONTHLY_TOP_TRACK_LIMIT } from "../utils/monthlyTopTracks";
import { MONTHLY_TOP_ARTISTS_LIMIT } from "../utils/monthlyTopArtists";
import {
  ALBUMS_CACHE_KEY,
  DAILY_TOP_ARTISTS_CACHE_KEY,
  DAILY_TOP_ARTISTS_DATE,
  DAILY_TOP_ARTISTS_LIMIT,
  DAILY_TOP_TRACKS_CACHE_KEY,
  DAILY_TOP_TRACKS_DATE,
  getHomePageCachedSections,
  MONTHLY_TOP_ARTISTS_CACHE_KEY,
  MONTHLY_TOP_ARTISTS_DATE,
  MONTHLY_TOP_TRACKS_CACHE_KEY,
  MONTHLY_TOP_TRACKS_DATE,
  setCachedHomeSection,
  SYSTEM_PLAYLISTS_CACHE_KEY,
} from "../utils/homePageCache";

export const useHomePageData = () => {
  const {
    cachedAlbums,
    cachedSystemPlaylists,
    cachedDailyTopTracks,
    cachedMonthlyTopTracks,
    cachedMonthlyTopArtists,
    cachedDailyTopArtists,
  } = getHomePageCachedSections();

  const [albums, setAlbums] = useState(() => cachedAlbums?.albums || []);
  const [systemPlaylists, setSystemPlaylists] = useState(
    () => cachedSystemPlaylists?.playlists || []
  );
  const [dailyTopTracks, setDailyTopTracks] = useState(
    () => cachedDailyTopTracks?.topTracks || []
  );
  const [dailyTopTracksMeta, setDailyTopTracksMeta] = useState(
    () => cachedDailyTopTracks?.meta || null
  );
  const [monthlyTopTracks, setMonthlyTopTracks] = useState(
    () => cachedMonthlyTopTracks?.topTracks || []
  );
  const [monthlyTopTracksMeta, setMonthlyTopTracksMeta] = useState(
    () => cachedMonthlyTopTracks?.meta || null
  );
  const [monthlyTopArtists, setMonthlyTopArtists] = useState(
    () => cachedMonthlyTopArtists?.topArtists || []
  );
  const [monthlyTopArtistsMeta, setMonthlyTopArtistsMeta] = useState(
    () => cachedMonthlyTopArtists?.meta || null
  );
  const [dailyTopArtists, setDailyTopArtists] = useState(
    () => cachedDailyTopArtists?.topArtists || []
  );

  const [isLoadingAlbums, setIsLoadingAlbums] = useState(() => !cachedAlbums);
  const [isLoadingSystemPlaylists, setIsLoadingSystemPlaylists] = useState(
    () => !cachedSystemPlaylists
  );
  const [isLoadingDailyTopTracks, setIsLoadingDailyTopTracks] = useState(
    () => !cachedDailyTopTracks
  );
  const [isLoadingMonthlyTopTracks, setIsLoadingMonthlyTopTracks] = useState(
    () => !cachedMonthlyTopTracks
  );
  const [isLoadingMonthlyTopArtists, setIsLoadingMonthlyTopArtists] = useState(
    () => !cachedMonthlyTopArtists
  );
  const [isLoadingDailyTopArtists, setIsLoadingDailyTopArtists] = useState(
    () => !cachedDailyTopArtists
  );

  const [albumsError, setAlbumsError] = useState("");
  const [systemPlaylistsError, setSystemPlaylistsError] = useState("");
  const [dailyTopTracksError, setDailyTopTracksError] = useState("");
  const [monthlyTopTracksError, setMonthlyTopTracksError] = useState("");
  const [monthlyTopArtistsError, setMonthlyTopArtistsError] = useState("");
  const [dailyTopArtistsError, setDailyTopArtistsError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadHomeContent = async () => {
      const shouldLoadAlbums = !cachedAlbums;
      const shouldLoadSystemPlaylists = !cachedSystemPlaylists;
      const shouldLoadDailyTopTracks = !cachedDailyTopTracks;
      const shouldLoadMonthlyTopTracks = !cachedMonthlyTopTracks;
      const shouldLoadMonthlyTopArtists = !cachedMonthlyTopArtists;

      if (
        !shouldLoadAlbums &&
        !shouldLoadSystemPlaylists &&
        !shouldLoadDailyTopTracks &&
        !shouldLoadMonthlyTopTracks &&
        !shouldLoadMonthlyTopArtists
      ) {
        return;
      }

      if (shouldLoadAlbums) {
        setIsLoadingAlbums(true);
        setAlbumsError("");
      }

      if (shouldLoadSystemPlaylists) {
        setIsLoadingSystemPlaylists(true);
        setSystemPlaylistsError("");
      }

      if (shouldLoadDailyTopTracks) {
        setIsLoadingDailyTopTracks(true);
        setDailyTopTracksError("");
      }

      if (shouldLoadMonthlyTopTracks) {
        setIsLoadingMonthlyTopTracks(true);
        setMonthlyTopTracksError("");
      }

      if (shouldLoadMonthlyTopArtists) {
        setIsLoadingMonthlyTopArtists(true);
        setMonthlyTopArtistsError("");
      }

      const [
        albumsResult,
        systemPlaylistsResult,
        dailyTopTracksResult,
        monthlyTopTracksResult,
        monthlyTopArtistsResult,
      ] = await Promise.allSettled([
        shouldLoadAlbums ? getAlbumsService({ limit: 10 }) : Promise.resolve(null),
        shouldLoadSystemPlaylists
          ? getSystemPlaylistsService({ limit: 10 })
          : Promise.resolve(null),
        shouldLoadDailyTopTracks
          ? getDailyTopTracksService({
              date: DAILY_TOP_TRACKS_DATE,
              limit: DAILY_TOP_TRACK_LIMIT,
            })
          : Promise.resolve(null),
        shouldLoadMonthlyTopTracks
          ? getMonthlyTopTracksService({
              month: MONTHLY_TOP_TRACKS_DATE,
              limit: MONTHLY_TOP_TRACK_LIMIT,
            })
          : Promise.resolve(null),
        shouldLoadMonthlyTopArtists
          ? getMonthlyTopArtistsService({
              month: MONTHLY_TOP_ARTISTS_DATE,
              limit: MONTHLY_TOP_ARTISTS_LIMIT,
            })
          : Promise.resolve(null),
      ]);

      if (!isMounted) {
        return;
      }

      if (shouldLoadAlbums) {
        if (albumsResult.status === "fulfilled") {
          setAlbums(albumsResult.value.albums);
          setCachedHomeSection("albums", ALBUMS_CACHE_KEY, {
            albums: albumsResult.value.albums,
          });
        } else {
          setAlbums([]);
          setAlbumsError(
            getApiErrorMessage(
              albumsResult.reason,
              "Không thể tải danh sách album từ hệ thống lúc này."
            )
          );
        }

        setIsLoadingAlbums(false);
      }

      if (shouldLoadSystemPlaylists) {
        if (systemPlaylistsResult.status === "fulfilled") {
          setSystemPlaylists(systemPlaylistsResult.value.playlists);
          setCachedHomeSection("systemPlaylists", SYSTEM_PLAYLISTS_CACHE_KEY, {
            playlists: systemPlaylistsResult.value.playlists,
          });
        } else {
          setSystemPlaylists([]);
          setSystemPlaylistsError(
            getApiErrorMessage(
              systemPlaylistsResult.reason,
              "Không thể tải playlist hệ thống từ hệ thống lúc này."
            )
          );
        }

        setIsLoadingSystemPlaylists(false);
      }

      if (shouldLoadDailyTopTracks) {
        if (dailyTopTracksResult.status === "fulfilled") {
          setDailyTopTracks(dailyTopTracksResult.value.topTracks);
          setDailyTopTracksMeta(dailyTopTracksResult.value.meta || null);
          setCachedHomeSection("dailyTopTracks", DAILY_TOP_TRACKS_CACHE_KEY, {
            topTracks: dailyTopTracksResult.value.topTracks,
            meta: dailyTopTracksResult.value.meta || null,
          });
        } else {
          setDailyTopTracks([]);
          setDailyTopTracksMeta(null);
          setDailyTopTracksError(
            getApiErrorMessage(
              dailyTopTracksResult.reason,
              "Không thể tải bảng xếp hạng bài hát theo ngày lúc này."
            )
          );
        }

        setIsLoadingDailyTopTracks(false);
      }

      if (shouldLoadMonthlyTopTracks) {
        if (monthlyTopTracksResult.status === "fulfilled") {
          setMonthlyTopTracks(monthlyTopTracksResult.value.topTracks);
          setMonthlyTopTracksMeta(monthlyTopTracksResult.value.meta || null);
          setCachedHomeSection("monthlyTopTracks", MONTHLY_TOP_TRACKS_CACHE_KEY, {
            topTracks: monthlyTopTracksResult.value.topTracks,
            meta: monthlyTopTracksResult.value.meta || null,
          });
        } else {
          setMonthlyTopTracks([]);
          setMonthlyTopTracksMeta(null);
          setMonthlyTopTracksError(
            getApiErrorMessage(
              monthlyTopTracksResult.reason,
              "Không thể tải bảng xếp hạng bài hát theo tháng lúc này."
            )
          );
        }

        setIsLoadingMonthlyTopTracks(false);
      }

      if (shouldLoadMonthlyTopArtists) {
        if (monthlyTopArtistsResult.status === "fulfilled") {
          setMonthlyTopArtists(monthlyTopArtistsResult.value.topArtists);
          setMonthlyTopArtistsMeta(monthlyTopArtistsResult.value.meta || null);
          setCachedHomeSection("monthlyTopArtists", MONTHLY_TOP_ARTISTS_CACHE_KEY, {
            topArtists: monthlyTopArtistsResult.value.topArtists,
            meta: monthlyTopArtistsResult.value.meta || null,
          });
        } else {
          setMonthlyTopArtists([]);
          setMonthlyTopArtistsMeta(null);
          setMonthlyTopArtistsError(
            getApiErrorMessage(
              monthlyTopArtistsResult.reason,
              "Không thể tải bảng xếp hạng nghệ sĩ theo tháng lúc này."
            )
          );
        }

        setIsLoadingMonthlyTopArtists(false);
      }
    };

    loadHomeContent();

    return () => {
      isMounted = false;
    };
  }, [
    cachedAlbums,
    cachedDailyTopTracks,
    cachedMonthlyTopArtists,
    cachedMonthlyTopTracks,
    cachedSystemPlaylists,
  ]);

  useEffect(() => {
    let isMounted = true;

    const loadDailyTopArtists = async () => {
      if (cachedDailyTopArtists) {
        return;
      }

      setIsLoadingDailyTopArtists(true);
      setDailyTopArtistsError("");

      try {
        const response = await getDailyTopArtistsService({
          date: DAILY_TOP_ARTISTS_DATE,
          limit: DAILY_TOP_ARTISTS_LIMIT,
        });

        if (!isMounted) {
          return;
        }

        setDailyTopArtists(response.topArtists);
        setCachedHomeSection("dailyTopArtists", DAILY_TOP_ARTISTS_CACHE_KEY, {
          topArtists: response.topArtists,
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

      setDailyTopArtists([]);
      setDailyTopArtistsError(
        getApiErrorMessage(
          error,
          "Không thể tải bảng xếp hạng nghệ sĩ theo ngày lúc này."
        )
      );
      } finally {
        if (isMounted) {
          setIsLoadingDailyTopArtists(false);
        }
      }
    };

    loadDailyTopArtists();

    return () => {
      isMounted = false;
    };
  }, [cachedDailyTopArtists]);

  return {
    albums,
    systemPlaylists,
    dailyTopTracks,
    dailyTopTracksMeta,
    monthlyTopTracks,
    monthlyTopTracksMeta,
    monthlyTopArtists,
    monthlyTopArtistsMeta,
    dailyTopArtists,
    isLoadingAlbums,
    isLoadingSystemPlaylists,
    isLoadingDailyTopTracks,
    isLoadingMonthlyTopTracks,
    isLoadingMonthlyTopArtists,
    isLoadingDailyTopArtists,
    albumsError,
    systemPlaylistsError,
    dailyTopTracksError,
    monthlyTopTracksError,
    monthlyTopArtistsError,
    dailyTopArtistsError,
    dailyTopTracksDate: DAILY_TOP_TRACKS_DATE,
    monthlyTopTracksDate: MONTHLY_TOP_TRACKS_DATE,
    monthlyTopArtistsDate: MONTHLY_TOP_ARTISTS_DATE,
    dailyTopTracksLimit: DAILY_TOP_TRACK_LIMIT,
    monthlyTopTracksLimit: MONTHLY_TOP_TRACK_LIMIT,
    monthlyTopArtistsLimit: MONTHLY_TOP_ARTISTS_LIMIT,
  };
};
