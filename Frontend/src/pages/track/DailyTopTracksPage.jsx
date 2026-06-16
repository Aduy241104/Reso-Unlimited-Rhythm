import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  MoreHorizontal,
  Pause,
  Play,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import PlayButton from "../../components/common/PlayButton";
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
  { label: "Hạng" },
  { label: "Tiêu đề" },
  { label: "Tăng trưởng", className: "text-right" },
  { label: "Thời lượng", className: "text-right" },
  { label: "" },
];

const dailyChartHeaderGridClassName = `
  mb-0 hidden grid-cols-[5.5rem_minmax(0,1fr)_9.5rem_3rem_2rem] items-center gap-3
  border-b border-white/[0.06] px-4 pb-4 pt-1 text-[11px] font-semibold uppercase
  tracking-[0.24em] text-white/42 sm:grid
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
    return "Chưa rõ ngày";
  }

  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
};

const formatNumber = (value) => new Intl.NumberFormat("vi-VN").format(Number(value) || 0);

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
  const rankChangeAmount = getRankChangeAmount(item);

  switch (rankTrend) {
    case "up":
      return {
        icon: ArrowUp,
        badgeLabel: rankChangeAmount > 0 ? `+${rankChangeAmount}` : "Tăng",
        badgeClassName:
          "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
      };
    case "down":
      return {
        icon: ArrowDown,
        badgeLabel: rankChangeAmount > 0 ? `-${rankChangeAmount}` : "Giảm",
        badgeClassName:
          "border-rose-400/20 bg-rose-500/10 text-rose-300",
      };
    case "new":
      return {
        icon: null,
        badgeLabel: "MỚI",
        badgeClassName:
          "border-violet-400/20 bg-violet-500/10 text-violet-300",
      };
    default:
      return {
        icon: null,
        badgeLabel: "GIỮ",
        badgeClassName:
          "border-white/[0.08] bg-white/[0.06] text-white/55",
      };
  }
};

const renderGrowthContent = (playCount, totalPlay, isMobile = false) => {
  const safePlayCount = Number(playCount) || 0;
  const safeTotalPlay = Number(totalPlay) || 0;
  const primaryLabel = `+${formatNumber(safePlayCount)}`;
  const secondaryLabel =
    safeTotalPlay > 0
      ? `lên ${formatNumber(safeTotalPlay)} lượt phát`
      : "lượt phát";

  return (
    <span className={ [
      "inline-flex items-center text-emerald-300",
      isMobile
        ? "rounded-full border border-emerald-400/10 bg-emerald-500/10 px-2 py-0.5 text-[10px] sm:hidden"
        : "justify-end gap-2 text-right",
    ].join(" ") }>
      <TrendingUp className={ `${isMobile ? "mr-1 h-3 w-3" : "h-3.5 w-3.5 shrink-0"}` } />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-xs font-semibold leading-none text-emerald-300">
          { primaryLabel }
        </span>
        <span className="truncate pt-0.5 text-[10px] font-medium leading-none text-white">
          { secondaryLabel }
        </span>
      </span>
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
        "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em]",
        isMobile ? "min-w-[2.85rem] justify-center" : "",
        badgeClassName,
      ].join(" ").trim() }
    >
      { Icon ? <Icon className="h-2.5 w-2.5" /> : null }
      <span>{ badgeLabel }</span>
    </span>
  );
};

const renderRankCellContent = (item) => (
  <span className="inline-flex items-center gap-2">
    <span className="w-4 text-[13px] font-semibold text-white">{ item?.rank || 0 }</span>
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
            "Không thể tải bảng xếp hạng bài hát theo ngày lúc này."
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
      topTrack?.artist?.coverImage ||
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
    title: `Top bài hát ngày - ${selectedDate}`,
    image: heroImage,
    artistName: "Reso",
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

  const renderDailyTrackRow = (item, index) => {
    const track = item?.track;
    const totalPlay = Number(track?.stats?.totalPlay) || 0;
    const durationLabel = formatTrackDuration(track?.duration);
    const image =
      track?.coverImage ||
      track?.avatar ||
      track?.artist?.avatar ||
      heroImage;
    const isPlaybackActive = currentTrack?.id === track?.id;
    const PlaybackIcon = isPlaybackActive && isPlaying ? Pause : Play;

    return (
      <div
        key={ track?.id || `${selectedDate}-${index}` }
        className={ [
          "group grid grid-cols-[4.2rem_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-2.5 transition sm:grid-cols-[5.15rem_minmax(0,1fr)_8.75rem_2.75rem_2rem] sm:px-4",
          isPlaybackActive ? "bg-white/[0.045]" : "hover:bg-white/[0.03]",
        ].join(" ") }
      >
        <div className="flex items-center">
          { renderRankCellContent(item) }
        </div>

        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={ () => handlePlayTrack(track, index) }
            aria-label={ `${isPlaybackActive && isPlaying ? "Tạm dừng" : "Phát"} ${track?.title || "bài hát"}` }
            className="relative h-9 w-9 shrink-0 overflow-hidden rounded-[10px] bg-white/6 shadow-[0_10px_20px_rgba(0,0,0,0.24)] sm:h-10 sm:w-10"
          >
            { image ? (
              <img
                src={ image }
                alt={ track?.title || "Ảnh bìa bài hát" }
                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04] group-hover:brightness-[0.4]"
              />
            ) : (
              <div className="h-full w-full bg-[linear-gradient(135deg,#262b39,#12161f)]" />
            ) }
            <span
              className={ [
                "absolute inset-0 flex items-center justify-center bg-black/35 text-white transition duration-300 sm:bg-black/0 sm:opacity-0 sm:group-hover:bg-black/45 sm:group-hover:opacity-100",
                isPlaybackActive ? "opacity-100" : "opacity-90 sm:opacity-0",
              ].join(" ") }
            >
              <PlaybackIcon className="h-3.5 w-3.5 fill-current drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]" />
            </span>
          </button>

          <div className="min-w-0">
            { track?.id ? (
              <Link
                to={ routePaths.trackDetail(track.id) }
                className={ [
                  "block truncate text-[13px] font-semibold transition hover:text-white/88 hover:underline sm:text-sm",
                  isPlaybackActive ? "text-emerald-300" : "text-white",
                ].join(" ") }
              >
                { track?.title || "Bài hát chưa có tên" }
              </Link>
            ) : (
              <p className={ [
                "truncate text-[13px] font-semibold sm:text-sm",
                isPlaybackActive ? "text-emerald-300" : "text-white",
              ].join(" ") }>
                { track?.title || "Bài hát chưa có tên" }
              </p>
            ) }

            <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-white/42 sm:text-[11px]">
              { track?.artist?.id ? (
                <Link
                  to={ `/artists/${track.artist.id}` }
                  className="truncate transition hover:text-white/72 hover:underline"
                >
                  { track?.artist?.name || "Nghệ sĩ không xác định" }
                </Link>
              ) : (
                <span className="truncate">{ track?.artist?.name || "Nghệ sĩ không xác định" }</span>
              ) }
              <span className="sm:hidden">{ durationLabel }</span>
              <span className="sm:hidden">
                { renderGrowthContent(item?.playCount, totalPlay, true) }
              </span>
            </div>
          </div>
        </div>

        <div className="hidden items-center justify-end sm:flex">
          { renderGrowthContent(item?.playCount, totalPlay) }
        </div>

        <div className="text-right text-[11px] font-medium text-white/56 sm:text-xs">
          { durationLabel }
        </div>

        <div className="hidden items-center justify-end text-white/46 sm:flex">
          <MoreHorizontal className="h-3.5 w-3.5" />
        </div>
      </div>
    );
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
              <p className="text-sm text-white/82">Đang tải bảng xếp hạng ngày...</p>
            </div>
          ) : errorMessage ? (
            <div className="relative z-10 flex min-h-[20rem] items-end">
              <p className="max-w-xl text-sm text-white/88">{ errorMessage }</p>
            </div>
          ) : (
            <div className="relative z-10 flex min-h-[20rem] flex-col items-center justify-end gap-5 text-center md:flex-row md:items-end md:justify-start md:text-left">
              <img
                src={ heroImage }
                alt="Ảnh bìa top bài hát ngày"
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
                  Bảng xếp hạng ngày
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:mt-3 sm:text-5xl lg:text-6xl">
                  Top bài hát theo ngày
                </h1>
                <p className="mt-3 text-sm leading-6 text-white/88 sm:mt-4 sm:text-base">
                  { DAILY_TOP_TRACK_LIMIT } bài hát được phát nhiều nhất vào { chartDateLabel }.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <span className={ `${metaPillClassName} font-medium text-white` }>
                    Top { DAILY_TOP_TRACK_LIMIT }
                  </span>
                  <span className={ metaPillClassName }>{ formatNumber(totalPlayCount) } lượt phát</span>
                  <span className={ metaPillClassName }>
                    { formatNumber(totalListeners) } người nghe
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
            loadingMessage="Đang tải bài hát..."
            mobileLabel="Bảng xếp hạng"
            headerColumns={ dailyChartHeaderColumns }
            headerGridClassName={ dailyChartHeaderGridClassName }
            emptyMessage="Chưa có dữ liệu top bài hát cho ngày này."
            hasItems={ dailyTopTracks.length > 0 }
            loadingClassName="rounded-[24px] border-white/[0.06] bg-transparent text-white/58"
            containerClassName="overflow-hidden rounded-[24px] border-white/[0.06] bg-transparent !p-0 shadow-none sm:!p-0"
            mobileLabelClassName="px-4 pt-4 text-white/36"
            emptyMessageClassName="px-4 py-6 text-white/52"
          >
            { dailyTopTracks.map(renderDailyTrackRow) }
          </TrackListSection>
        </div>
      </div>
    </section>
  );
};

export default DailyTopTracksPage;
