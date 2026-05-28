import { useEffect, useState } from "react";
import DailyTopArtistsSection from "../../components/home/DailyTopArtistsSection";
import ContentCardSection from "../../components/content/ContentCardSection";
import { useContentPlayback } from "../../hooks/useContentPlayback";
import { getAlbumsService } from "../../services/albumService";
import { getDailyTopArtistsService } from "../../services/artistBrowseService";
import { getSystemPlaylistsService } from "../../services/playlistService";
import {
  getDailyTopTracksService,
  getMonthlyTopTracksService,
} from "../../services/trackService";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  DAILY_TOP_TRACK_LIMIT,
  getPreviousDateValue,
  mapDailyTopTracksToContentCards,
} from "../../utils/dailyTopTracks";
import {
  MONTHLY_TOP_TRACK_LIMIT,
  getCurrentMonthValue,
  mapMonthlyTopTracksToContentCards,
} from "../../utils/monthlyTopTracks";
import {
  mapAlbumsToContentCards,
  mapSystemPlaylistsToContentCards,
} from "../../utils/homeContent";

const DAILY_TOP_ARTISTS_DATE = "2026-05-27";
const DAILY_TOP_ARTISTS_LIMIT = 9;
const DAILY_TOP_TRACKS_DATE = getPreviousDateValue();
const MONTHLY_TOP_TRACKS_DATE = getCurrentMonthValue();

const HomePage = () => {
  const [albums, setAlbums] = useState([]);
  const [systemPlaylists, setSystemPlaylists] = useState([]);
  const [dailyTopTracks, setDailyTopTracks] = useState([]);
  const [dailyTopTracksMeta, setDailyTopTracksMeta] = useState(null);
  const [monthlyTopTracks, setMonthlyTopTracks] = useState([]);
  const [monthlyTopTracksMeta, setMonthlyTopTracksMeta] = useState(null);
  const [dailyTopArtists, setDailyTopArtists] = useState([]);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(true);
  const [isLoadingSystemPlaylists, setIsLoadingSystemPlaylists] = useState(true);
  const [isLoadingDailyTopTracks, setIsLoadingDailyTopTracks] = useState(true);
  const [isLoadingMonthlyTopTracks, setIsLoadingMonthlyTopTracks] = useState(true);
  const [isLoadingDailyTopArtists, setIsLoadingDailyTopArtists] = useState(true);
  const [albumsError, setAlbumsError] = useState("");
  const [systemPlaylistsError, setSystemPlaylistsError] = useState("");
  const [dailyTopTracksError, setDailyTopTracksError] = useState("");
  const [monthlyTopTracksError, setMonthlyTopTracksError] = useState("");
  const [dailyTopArtistsError, setDailyTopArtistsError] = useState("");
  const {
    playbackError,
    playAlbumItem,
    playDailyTopTracksItem,
    playMonthlyTopTracksItem,
    playPlaylistItem,
  } = useContentPlayback();

  useEffect(() => {
    let isMounted = true;

    const loadHomeContent = async () => {
      setIsLoadingAlbums(true);
      setIsLoadingSystemPlaylists(true);
      setIsLoadingDailyTopTracks(true);
      setIsLoadingMonthlyTopTracks(true);
      setAlbumsError("");
      setSystemPlaylistsError("");
      setDailyTopTracksError("");
      setMonthlyTopTracksError("");

      const [albumsResult, systemPlaylistsResult, dailyTopTracksResult, monthlyTopTracksResult] =
        await Promise.allSettled([
          getAlbumsService({ limit: 10 }),
          getSystemPlaylistsService({ limit: 10 }),
          getDailyTopTracksService({
            date: DAILY_TOP_TRACKS_DATE,
            limit: DAILY_TOP_TRACK_LIMIT,
          }),
          getMonthlyTopTracksService({
            month: MONTHLY_TOP_TRACKS_DATE,
            limit: MONTHLY_TOP_TRACK_LIMIT,
          }),
        ]);

      if (!isMounted) {
        return;
      }

      if (albumsResult.status === "fulfilled") {
        setAlbums(albumsResult.value.albums);
      } else {
        setAlbums([]);
        setAlbumsError(
          getApiErrorMessage(
            albumsResult.reason,
            "Unable to load albums from the backend right now."
          )
        );
      }

      if (systemPlaylistsResult.status === "fulfilled") {
        setSystemPlaylists(systemPlaylistsResult.value.playlists);
      } else {
        setSystemPlaylists([]);
        setSystemPlaylistsError(
          getApiErrorMessage(
            systemPlaylistsResult.reason,
            "Unable to load system playlists from the backend right now."
          )
        );
      }

      if (dailyTopTracksResult.status === "fulfilled") {
        setDailyTopTracks(dailyTopTracksResult.value.topTracks);
        setDailyTopTracksMeta(dailyTopTracksResult.value.meta || null);
      } else {
        setDailyTopTracks([]);
        setDailyTopTracksMeta(null);
        setDailyTopTracksError(
          getApiErrorMessage(
            dailyTopTracksResult.reason,
            "Unable to load daily top tracks from the backend right now."
          )
        );
      }

      if (monthlyTopTracksResult.status === "fulfilled") {
        setMonthlyTopTracks(monthlyTopTracksResult.value.topTracks);
        setMonthlyTopTracksMeta(monthlyTopTracksResult.value.meta || null);
      } else {
        setMonthlyTopTracks([]);
        setMonthlyTopTracksMeta(null);
        setMonthlyTopTracksError(
          getApiErrorMessage(
            monthlyTopTracksResult.reason,
            "Unable to load monthly top tracks from the backend right now."
          )
        );
      }

      setIsLoadingAlbums(false);
      setIsLoadingSystemPlaylists(false);
      setIsLoadingDailyTopTracks(false);
      setIsLoadingMonthlyTopTracks(false);
    };

    loadHomeContent();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadDailyTopArtists = async () => {
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
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setDailyTopArtists([]);
        setDailyTopArtistsError(
          getApiErrorMessage(
            error,
            "Unable to load daily top artists from the backend right now."
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
  }, []);

  return (
    <section className="space-y-8 sm:space-y-10">
      { albumsError ? (
        <div
          className="
            rounded-[18px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm
            text-amber-700 dark:text-amber-300
          "
        >
          { albumsError }
        </div>
      ) : null }

      { systemPlaylistsError ? (
        <div
          className="
            rounded-[18px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm
            text-amber-700 dark:text-amber-300
          "
        >
          { systemPlaylistsError }
        </div>
      ) : null }

      { dailyTopTracksError ? (
        <div
          className="
            rounded-[18px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm
            text-amber-700 dark:text-amber-300
          "
        >
          { dailyTopTracksError }
        </div>
      ) : null }

      { monthlyTopTracksError ? (
        <div
          className="
            rounded-[18px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm
            text-amber-700 dark:text-amber-300
          "
        >
          { monthlyTopTracksError }
        </div>
      ) : null }

      <ContentCardSection
        label="Charts"
        title="Top Track Charts"
        description="Open the latest daily and monthly snapshots, or jump straight into the most-played tracks in the app."
        items={ [
          ...(!dailyTopTracksError
            ? mapDailyTopTracksToContentCards({
                topTracks: dailyTopTracks,
                meta: dailyTopTracksMeta || {},
                date: DAILY_TOP_TRACKS_DATE,
                limit: DAILY_TOP_TRACK_LIMIT,
              }).map((item) => ({
                ...item,
                raw: {
                  ...item.raw,
                  period: "daily",
                },
              }))
            : []),
          ...(!monthlyTopTracksError
            ? mapMonthlyTopTracksToContentCards({
                topTracks: monthlyTopTracks,
                meta: monthlyTopTracksMeta || {},
                month: MONTHLY_TOP_TRACKS_DATE,
                limit: MONTHLY_TOP_TRACK_LIMIT,
              }).map((item) => ({
                ...item,
                raw: {
                  ...item.raw,
                  period: "monthly",
                },
              }))
            : []),
        ] }
        isLoading={ isLoadingDailyTopTracks || isLoadingMonthlyTopTracks }
        emptyMessage="The track chart endpoints returned no data yet."
        onPlay={ (item) =>
          item?.raw?.period === "monthly"
            ? playMonthlyTopTracksItem(item)
            : playDailyTopTracksItem(item)
        }
      />

      <ContentCardSection
        title="System Playlist"
        description="Discover playlists curated to help you enjoy the right music at the right moment."
        items={ mapSystemPlaylistsToContentCards(systemPlaylists) }
        isLoading={ isLoadingSystemPlaylists }
        emptyMessage="The system playlist endpoint returned no data yet."
        onPlay={ playPlaylistItem }
      />

      <DailyTopArtistsSection
        title="Daily Top Artists"
        description="Most popular artists today."
        items={ dailyTopArtists }
        isLoading={ isLoadingDailyTopArtists }
        errorMessage={ dailyTopArtistsError }
        emptyMessage="No ranking data available today."
      />

      <ContentCardSection
        label="Albums"
        title="Latest album data"
        description="Browse featured albums and discover music collections tailored for every mood."
        items={ mapAlbumsToContentCards(albums) }
        isLoading={ isLoadingAlbums }
        emptyMessage="The album endpoint returned no data yet."
        onPlay={ playAlbumItem }
      />

      { playbackError ? (
        <div
          className="
            rounded-[18px] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm
            text-rose-700 dark:text-rose-300
          "
        >
          { playbackError }
        </div>
      ) : null }
    </section>
  );
};

export default HomePage;
