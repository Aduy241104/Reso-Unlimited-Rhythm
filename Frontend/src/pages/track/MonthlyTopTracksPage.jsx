import { useEffect, useMemo, useState } from "react";
import PlayButton from "../../components/common/PlayButton";
import TrackCard from "../../components/TrackCard";
import TrackListSection from "../../components/trackList/TrackListSection";
import { usePlayer } from "../../hooks/usePlayer";
import { routePaths } from "../../routes/routePaths";
import { getMonthlyTopTracksService } from "../../services/trackService";
import { formatTrackDuration } from "../../utils/albumDetail";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  MONTHLY_TOP_TRACK_LIMIT,
  createMonthlyTopTracksCollectionMeta,
  formatMonthlyTopTracksDate,
  getCurrentMonthValue,
  getMonthlyTopTracksHeroImage,
} from "../../utils/monthlyTopTracks";

const metaPillClassName = `
  inline-flex items-center rounded-full border border-white/14 bg-white/10
  px-3 py-1.5 text-xs text-white/88 backdrop-blur-sm sm:text-sm
`;

const monthlyChartHeaderColumns = [
  { label: "Rank" },
  { label: "Title" },
  { label: "Plays", className: "text-right" },
  { label: "Time", className: "text-right" },
];

const monthlyChartHeaderGridClassName = `
  mb-2 hidden grid-cols-[2.5rem_minmax(0,1fr)_8rem_3rem] items-center gap-3
  border-b border-black/6 px-3 pb-3 text-xs font-medium uppercase tracking-[0.24em]
  text-[#71717a] dark:border-white/10 dark:text-[#a1a1aa] sm:grid
`;

const formatNumber = (value) => new Intl.NumberFormat("en-US").format(Number(value) || 0);

const renderMonthlyPlayCount = (playCount, isMobile = false) => (
  <span
    className={ [
      "inline-flex items-center gap-1 font-medium text-[#0284c7] dark:text-[#38bdf8]",
      isMobile
        ? "rounded-full bg-[#0ea5e9]/10 px-2 py-0.5 text-[11px] sm:hidden"
        : "justify-end text-xs",
    ].join(" ") }
  >
    <span className="truncate">{ formatNumber(playCount) } plays</span>
  </span>
);

const MonthlyTopTracksPage = () => {
  const [selectedMonth] = useState(getCurrentMonthValue);
  const [monthlyTopTracks, setMonthlyTopTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [chartMeta, setChartMeta] = useState(null);
  const {
    currentTrack,
    isPlaying,
    playCollection,
    playTrack,
    togglePlayPause,
  } = usePlayer();

  useEffect(() => {
    let isMounted = true;

    const loadMonthlyTopTracks = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await getMonthlyTopTracksService({
          month: selectedMonth,
          limit: MONTHLY_TOP_TRACK_LIMIT,
        });

        if (!isMounted) {
          return;
        }

        setMonthlyTopTracks(response?.topTracks || []);
        setChartMeta(response?.meta || null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMonthlyTopTracks([]);
        setChartMeta(null);
        setErrorMessage(
          getApiErrorMessage(
            error,
            "Unable to load monthly top tracks from the backend right now."
          )
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadMonthlyTopTracks();

    return () => {
      isMounted = false;
    };
  }, [selectedMonth]);

  const heroImage = useMemo(() => {
    return getMonthlyTopTracksHeroImage(monthlyTopTracks);
  }, [monthlyTopTracks]);

  const totalPlayCount = monthlyTopTracks.reduce(
    (sum, item) => sum + (Number(item?.playCount) || 0),
    0
  );
  const totalListeners = monthlyTopTracks.reduce(
    (sum, item) => sum + (Number(item?.uniqueListeners) || 0),
    0
  );

  const resolvedMonth = chartMeta?.date || selectedMonth;
  const chartMonthLabel = formatMonthlyTopTracksDate(resolvedMonth);
  const collectionMeta = createMonthlyTopTracksCollectionMeta({
    month: resolvedMonth,
    image: heroImage,
  });

  const handlePlayChart = async () => {
    if (monthlyTopTracks.length === 0) {
      return;
    }

    await playCollection(monthlyTopTracks, {
      startIndex: 0,
      collection: collectionMeta,
    });
  };

  const handlePlayTrack = async (track, index) => {
    if (!track) {
      return;
    }

    if (currentTrack?.id && currentTrack.id === track.id) {
      await togglePlayPause();
      return;
    }

    await playTrack(track, {
      queue: monthlyTopTracks,
      startIndex: index,
      collection: collectionMeta,
    });
  };

  return (
    <section className="space-y-4 sm:space-y-6">
      <div
        className="
          overflow-hidden rounded-[14px] border border-black/5 bg-white/80
          shadow-[0_24px_60px_rgba(15,23,42,0.08)]
          dark:border-white/10 dark:bg-[#121212] dark:shadow-[0_24px_60px_rgba(0,0,0,0.36)]
        "
      >
        <div
          className="
            relative isolate overflow-hidden bg-center bg-cover bg-no-repeat
            px-4 pb-5 pt-6 sm:px-8 sm:pb-8 sm:pt-10
          "
        >
          { !isLoading && !errorMessage ? (
            <>
              <div
                className="absolute inset-0 bg-center bg-cover bg-no-repeat"
                style={ {
                  backgroundImage: `url(${heroImage})`,
                  transform: "scale(1.08)",
                  filter: "blur(8px) saturate(1.08) brightness(0.95)",
                } }
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.34)_0%,rgba(255,255,255,0.18)_34%,rgba(255,255,255,0.08)_100%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.42),transparent_44%)]" />
            </>
          ) : null }

          { isLoading ? (
            <div className="relative z-10 flex min-h-[20rem] items-end">
              <p className="text-sm text-white/82">Loading monthly top tracks...</p>
            </div>
          ) : errorMessage ? (
            <div className="relative z-10 flex min-h-[20rem] items-end">
              <p className="max-w-xl text-sm text-white/88">{ errorMessage }</p>
            </div>
          ) : (
            <div className="relative z-10 flex min-h-[20rem] flex-col items-center justify-end gap-5 text-center md:flex-row md:items-end md:justify-start md:text-left">
              <img
                src={ heroImage }
                alt="Monthly top tracks cover"
                className="
                  h-32 w-32 rounded-[18px] object-cover
                  shadow-[0_22px_52px_rgba(15,23,42,0.38)]
                  ring-1 ring-white/60 backdrop-blur-sm
                  min-[420px]:h-36 min-[420px]:w-36 sm:h-44 sm:w-44
                "
              />
              <div
                className="min-w-0 max-w-3xl"
                style={ { textShadow: "0 2px 18px rgba(0,0,0,0.32)" } }
              >
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/82">
                  Monthly chart
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:mt-3 sm:text-5xl lg:text-6xl">
                  Monthly Top Tracks
                </h1>
                <p className="mt-3 text-sm leading-6 text-white/88 sm:mt-4 sm:text-base">
                  The top { MONTHLY_TOP_TRACK_LIMIT } most-played tracks for { chartMonthLabel }.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <span className={ `${metaPillClassName} font-medium text-white` }>
                    Top { MONTHLY_TOP_TRACK_LIMIT }
                  </span>
                  <span className={ metaPillClassName }>{ formatNumber(totalPlayCount) } plays</span>
                  <span className={ metaPillClassName }>
                    { formatNumber(totalListeners) } listeners
                  </span>
                  <span className={ metaPillClassName }>{ chartMonthLabel }</span>
                </div>
              </div>
            </div>
          ) }
        </div>

        <div className="space-y-4 px-0 pb-4 pt-4 sm:space-y-5 sm:px-8 sm:pb-8 sm:pt-5">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <PlayButton
              onClick={ handlePlayChart }
              size="compact"
              disabled={ isLoading || monthlyTopTracks.length === 0 }
            />
          </div>

          <TrackListSection
            isLoading={ isLoading }
            errorMessage={ errorMessage }
            loadingMessage="Loading tracks..."
            mobileLabel="Monthly chart"
            headerColumns={ monthlyChartHeaderColumns }
            headerGridClassName={ monthlyChartHeaderGridClassName }
            emptyMessage="No monthly top tracks are available for this month yet."
            hasItems={ monthlyTopTracks.length > 0 }
          >
            { monthlyTopTracks.map((item, index) => (
              <TrackCard
                key={ item?.track?.id || `${resolvedMonth}-${index}` }
                index={ item?.rank || index + 1 }
                indexClassName="!text-sm sm:!text-base"
                image={
                  item?.track?.coverImage ||
                  item?.track?.avatar ||
                  item?.track?.artist?.avatar ||
                  heroImage
                }
                title={ item?.track?.title || "Untitled track" }
                artist={ item?.track?.artist?.name || "Unknown artist" }
                artistId={ item?.track?.artist?.id || "" }
                duration={ formatTrackDuration(item?.track?.duration) }
                href={ item?.track?.id ? routePaths.trackDetail(item.track.id) : undefined }
                size="compact"
                showLikeButton={ false }
                mobileLayoutClassName="grid-cols-[2rem_minmax(0,1fr)_auto]"
                desktopLayoutClassName="sm:grid-cols-[2.5rem_minmax(0,1fr)_8rem_3rem]"
                mobileMetaItems={ [
                  {
                    content: renderMonthlyPlayCount(item?.playCount, true),
                  },
                ] }
                desktopMetaColumns={ [
                  {
                    content: renderMonthlyPlayCount(item?.playCount),
                    className: "hidden items-center justify-end sm:flex",
                  },
                  {
                    content: formatTrackDuration(item?.track?.duration),
                    className:
                      "hidden items-center justify-end text-xs text-[#52525b] dark:text-[#a1a1aa] sm:flex",
                  },
                ] }
                isPlaybackActive={ currentTrack?.id === item?.track?.id }
                isPlaying={ isPlaying }
                onPlaybackAction={ () => handlePlayTrack(item?.track, index) }
              />
            )) }
          </TrackListSection>
        </div>
      </div>
    </section>
  );
};

export default MonthlyTopTracksPage;
