import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  TrendingUp,
} from "lucide-react";
import PlayButton from "../../components/common/PlayButton";
import TrackCard from "../../components/TrackCard";
import TrackListSection from "../../components/trackList/TrackListSection";
import { usePlayer } from "../../hooks/usePlayer";
import { routePaths } from "../../routes/routePaths";
import { getDailyTopTracksService } from "../../services/trackService";
import {
  createPlaceholderImage,
  formatTrackDuration,
} from "../../utils/albumDetail";
import { getApiErrorMessage } from "../../utils/apiError";

const DAILY_TOP_TRACK_LIMIT = 30;

const metaPillClassName = `
  inline-flex items-center rounded-full border border-white/14 bg-white/10
  px-3 py-1.5 text-xs text-white/88 backdrop-blur-sm sm:text-sm
`;

const dailyChartHeaderColumns = [
  { label: "Rank" },
  { label: "Title" },
  { label: "Growth", className: "text-right" },
  { label: "Time", className: "text-right" },
];

const dailyChartHeaderGridClassName = `
  mb-2 hidden grid-cols-[4.25rem_minmax(0,1fr)_9rem_3rem] items-center gap-3
  border-b border-black/6 px-3 pb-3 text-xs font-medium uppercase tracking-[0.24em]
  text-[#71717a] dark:border-white/10 dark:text-[#a1a1aa] sm:grid
`;

const getPreviousDateValue = () => {
  const previousDate = new Date();
  previousDate.setDate(previousDate.getDate() - 1);
  const year = previousDate.getFullYear();
  const month = String(previousDate.getMonth() + 1).padStart(2, "0");
  const day = String(previousDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatChartDate = (dateValue) => {
  if (!dateValue) {
    return "Unknown day";
  }

  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
};

const formatNumber = (value) => new Intl.NumberFormat("en-US").format(Number(value) || 0);

const getRankChangeAmount = (item) => {
  const currentRank = Number(item?.rank) || 0;
  const previousRank = Number(item?.previousRank) || 0;

  if (currentRank > 0 && previousRank > 0) {
    return Math.abs(previousRank - currentRank);
  }

  return Math.abs(Number(item?.rankChange) || 0);
};

const getRankTrendPresentation = (item) => {
  const rankTrend = typeof item?.rankTrend === "string" ? item.rankTrend.toLowerCase() : "";
  const previousRank = Number(item?.previousRank) || 0;
  const rankChangeAmount = getRankChangeAmount(item);

  switch (rankTrend) {
    case "up":
      return {
        icon: ArrowUp,
        badgeLabel: rankChangeAmount > 0 ? `+${rankChangeAmount}` : "Up",
        detail: previousRank > 0 ? `From #${previousRank}` : "Moved up",
        badgeClassName:
          "border-emerald-500/25 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
        detailClassName: "text-emerald-700 dark:text-emerald-300",
      };
    case "down":
      return {
        icon: ArrowDown,
        badgeLabel: rankChangeAmount > 0 ? `-${rankChangeAmount}` : "Down",
        detail: previousRank > 0 ? `From #${previousRank}` : "Moved down",
        badgeClassName:
          "border-rose-500/25 bg-rose-500/12 text-rose-700 dark:text-rose-300",
        detailClassName: "text-rose-700 dark:text-rose-300",
      };
    case "new":
      return {
        icon: null,
        badgeLabel: "NEW",
        detail: "New entry",
        badgeClassName:
          "border-sky-500/25 bg-sky-500/12 text-sky-700 dark:text-sky-300",
        detailClassName: "text-sky-700 dark:text-sky-300",
      };
    default:
      return {
        icon: null,
        badgeLabel: "UNCH",
        detail: previousRank > 0 ? `Still #${previousRank}` : "No change",
        badgeClassName:
          "border-slate-400/25 bg-slate-500/10 text-slate-700 dark:text-slate-300",
        detailClassName: "text-[#52525b] dark:text-[#a1a1aa]",
      };
  }
};

const renderGrowthContent = (playCount, totalPlay, isMobile = false) => {
  const safePlayCount = Number(playCount) || 0;
  const safeTotalPlay = Number(totalPlay) || 0;
  const label =
    safeTotalPlay > 0
      ? `+${formatNumber(safePlayCount)} to ${formatNumber(safeTotalPlay)} total`
      : `+${formatNumber(safePlayCount)} plays`;

  return (
    <span className={ [
      "inline-flex items-center gap-1 font-medium text-[#16a34a] dark:text-[#4ade80]",
      isMobile
        ? "rounded-full bg-[#16a34a]/10 px-2 py-0.5 text-[11px] sm:hidden"
        : "justify-end text-xs",
    ].join(" ") }>
      <TrendingUp className={ isMobile ? "h-3 w-3" : "h-3.5 w-3.5" } />
      <span className="truncate">{ label }</span>
    </span>
  );
};

const renderRankChangeContent = (item, isMobile = false) => {
  const {
    icon: Icon,
    badgeLabel,
    badgeClassName,
  } = getRankTrendPresentation(item);

  return (
    <span
      className={ [
        "inline-flex items-center gap-0.5 rounded-full border px-1.5 py-px text-[9px] font-semibold uppercase tracking-[0.12em]",
        isMobile ? "min-w-[2.6rem] justify-center" : "",
        badgeClassName,
      ].join(" ").trim() }
    >
      { Icon ? <Icon className="h-2.5 w-2.5" /> : null }
      <span>{ badgeLabel }</span>
    </span>
  );
};

const renderRankCellContent = (item) => (
  <span className="inline-flex items-center gap-1">
    <span>{ item?.rank || 0 }</span>
    { renderRankChangeContent(item, true) }
  </span>
);

const DailyTopTracksPage = () => {
  const [selectedDate] = useState(getPreviousDateValue);
  const [dailyTopTracks, setDailyTopTracks] = useState([]);
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

    const loadDailyTopTracks = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await getDailyTopTracksService({
          date: selectedDate,
          limit: DAILY_TOP_TRACK_LIMIT,
        });

        if (!isMounted) {
          return;
        }

        setDailyTopTracks(response?.topTracks || []);
        setChartMeta(response?.meta || null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setDailyTopTracks([]);
        setChartMeta(null);
        setErrorMessage(
          getApiErrorMessage(
            error,
            "Unable to load daily top tracks from the backend right now."
          )
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDailyTopTracks();

    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  const heroImage = useMemo(() => {
    const topTrack = dailyTopTracks[0]?.track;

    return (
      topTrack?.coverImage ||
      topTrack?.avatar ||
      topTrack?.artist?.avatar ||
      createPlaceholderImage("Top 30", "#f59e0b", "#7c2d12")
    );
  }, [dailyTopTracks]);

  const totalPlayCount = dailyTopTracks.reduce(
    (sum, item) => sum + (Number(item?.playCount) || 0),
    0
  );
  const totalListeners = dailyTopTracks.reduce(
    (sum, item) => sum + (Number(item?.uniqueListeners) || 0),
    0
  );

  const chartDateLabel = formatChartDate(chartMeta?.date || selectedDate);
  const collectionMeta = {
    id: `daily-top-${selectedDate}`,
    type: "daily-top",
    title: `Daily Top Tracks - ${selectedDate}`,
    image: heroImage,
    artistName: "Reso Music",
  };

  const handlePlayChart = async () => {
    if (dailyTopTracks.length === 0) {
      return;
    }

    await playCollection(dailyTopTracks, {
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
      queue: dailyTopTracks,
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
            bg-gradient-to-b from-[#f59e0b] via-[#9a3412] to-transparent
            px-4 pb-5 pt-6 dark:from-[#fbbf24] dark:via-[#7c2d12] dark:to-[#121212]
            sm:px-8 sm:pb-8 sm:pt-10
          "
        >
          { isLoading ? (
            <div className="flex min-h-[20rem] items-end">
              <p className="text-sm text-white/82">Loading daily top tracks...</p>
            </div>
          ) : errorMessage ? (
            <div className="flex min-h-[20rem] items-end">
              <p className="max-w-xl text-sm text-white/88">{ errorMessage }</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-5 text-center md:flex-row md:items-end md:text-left">
              <img
                src={ heroImage }
                alt="Daily top tracks cover"
                className="
                  h-32 w-32 rounded-[16px] object-cover shadow-[0_24px_60px_rgba(0,0,0,0.28)]
                  min-[420px]:h-36 min-[420px]:w-36 sm:h-56 sm:w-56
                "
              />

              <div className="min-w-0 max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/82">
                  Daily chart
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:mt-3 sm:text-5xl lg:text-6xl">
                  Daily Top Tracks
                </h1>
                <p className="mt-3 text-sm leading-6 text-white/88 sm:mt-4 sm:text-base">
                  The top { DAILY_TOP_TRACK_LIMIT } most-played tracks for { chartDateLabel }.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                  <span className={ `${metaPillClassName} font-medium text-white` }>
                    Top { DAILY_TOP_TRACK_LIMIT }
                  </span>
                  <span className={ metaPillClassName }>{ formatNumber(totalPlayCount) } plays</span>
                  <span className={ metaPillClassName }>
                    { formatNumber(totalListeners) } listeners
                  </span>
                  <span className={ metaPillClassName }>{ chartDateLabel }</span>
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
              disabled={ isLoading || dailyTopTracks.length === 0 }
            />
          </div>

          <TrackListSection
            isLoading={ isLoading }
            errorMessage={ errorMessage }
            loadingMessage="Loading tracks..."
            mobileLabel="Track chart"
            headerColumns={ dailyChartHeaderColumns }
            headerGridClassName={ dailyChartHeaderGridClassName }
            emptyMessage="No daily top tracks are available for this date yet."
            hasItems={ dailyTopTracks.length > 0 }
          >
            { dailyTopTracks.map((item, index) => {
              const totalPlay = Number(item?.track?.stats?.totalPlay) || 0;

              return (
                <TrackCard
                  key={ item?.track?.id || `${selectedDate}-${index}` }
                  index={ renderRankCellContent(item) }
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
                  mobileLayoutClassName="grid-cols-[4.1rem_minmax(0,1fr)_auto]"
                  desktopLayoutClassName="sm:grid-cols-[4.25rem_minmax(0,1fr)_9rem_3rem]"
                  mobileMetaItems={ [
                    {
                      content: renderGrowthContent(item?.playCount, totalPlay, true),
                    },
                  ] }
                  desktopMetaColumns={ [
                    {
                      content: renderGrowthContent(item?.playCount, totalPlay),
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
              );
            }) }
          </TrackListSection>
        </div>
      </div>
    </section>
  );
};

export default DailyTopTracksPage;
