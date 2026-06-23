import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ListMusic,
  LoaderCircle,
  Mic2,
  MoreHorizontal,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Settings2,
  SkipBack,
  SkipForward,
  Shuffle,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import PlayerQualityMenu from "../../components/player/PlayerQualityMenu";
import PlayerQueueMenu from "../../components/player/PlayerQueueMenu";
import { usePlayer } from "../../hooks/usePlayer";
import { routePaths } from "../../routes/routePaths";
import { formatTrackDuration } from "../../utils/albumDetail";

const controlButtonClassName =
  "inline-flex h-9 w-9 items-center justify-center rounded-full text-[#fff7ef] transition hover:bg-[#2b252f] disabled:cursor-not-allowed disabled:opacity-40";

const utilityButtonClassName =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#fff7ef] transition hover:bg-[#2b252f] disabled:cursor-not-allowed disabled:opacity-40";

const modeButtonClassName = (isActive = false) =>
  [
    controlButtonClassName,
    isActive ? "text-[#cfff73]" : "text-[#fff7ef]",
  ].join(" ");

const desktopModeButtonSizeClassName = "h-9 w-9 sm:h-10 sm:w-10";
const desktopModeIconSizeClassName = "h-4 w-4 sm:h-[18px] sm:w-[18px]";

const QUALITY_LABELS = {
  original: "Gốc",
  high: "Cao",
  medium: "Trung bình",
  low: "Thấp",
  lowest: "Thấp nhất",
};

const formatQualityLabel = (value = "") => {
  const normalizedValue =
    typeof value === "string" ? value.trim().toLowerCase() : "";

  if (!normalizedValue) {
    return "Tự động";
  }

  return QUALITY_LABELS[normalizedValue] || normalizedValue.toUpperCase();
};

const Player = ({ isDesktopSidebarVisible = true }) => {
  const navigate = useNavigate();
  const mobileMenuRef = useRef(null);
  const desktopQueueMenuRef = useRef(null);
  const desktopQualityMenuRef = useRef(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileQueueOpen, setIsMobileQueueOpen] = useState(false);
  const [isMobileQualityOpen, setIsMobileQualityOpen] = useState(false);
  const [isDesktopQueueOpen, setIsDesktopQueueOpen] = useState(false);
  const [isDesktopQualityOpen, setIsDesktopQualityOpen] = useState(false);
  const [removingQueueTrackIndex, setRemovingQueueTrackIndex] = useState(-1);
  const [isChangingQuality, setIsChangingQuality] = useState(false);
  const [pendingQualityUrl, setPendingQualityUrl] = useState("");
  const {
    queue,
    currentIndex,
    currentTrack,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    volume,
    errorMessage,
    restrictionMessage,
    activeCollection,
    isShuffleEnabled,
    repeatMode,
    isPremium,
    canSeek,
    availableAudioQualities,
    selectedQualityLabel,
    playFromQueueIndex,
    togglePlayPause,
    playNext,
    playPrevious,
    toggleShuffle,
    cycleRepeatMode,
    seekTo,
    changeAudioQuality,
    setVolumeLevel,
    removeTrackFromQueue,
  } = usePlayer();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
        setIsMobileQueueOpen(false);
        setIsMobileQualityOpen(false);
      }

      if (
        desktopQueueMenuRef.current &&
        !desktopQueueMenuRef.current.contains(event.target)
      ) {
        setIsDesktopQueueOpen(false);
      }

      if (
        desktopQualityMenuRef.current &&
        !desktopQualityMenuRef.current.contains(event.target)
      ) {
        setIsDesktopQualityOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") {
        return;
      }

      setIsMobileMenuOpen(false);
      setIsMobileQueueOpen(false);
      setIsMobileQualityOpen(false);
      setIsDesktopQueueOpen(false);
      setIsDesktopQualityOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const queueLabel = activeCollection?.title
    ? `${activeCollection.type === "playlist" ? "Playlist" : "Album"}: ${activeCollection.title}`
    : queue.length > 0
      ? `Hàng chờ: ${currentIndex + 1}/${queue.length}`
      : "Chọn bài hát để bắt đầu phát";

  const progressMax = duration > 0 ? duration : 0;
  const progressValue = duration > 0 ? Math.min(currentTime, duration) : 0;
  const progressPercent =
    progressMax > 0 ? Math.min((progressValue / progressMax) * 100, 100) : 0;
  const volumePercent = Math.round(volume * 100);
  const canPlayNext =
    queue.length > 0 &&
    (currentIndex < queue.length - 1 || repeatMode === "all" || currentIndex < 0);
  const hasQualitySelector = isPremium && availableAudioQualities.length > 1;
  const progressDisabled = progressMax === 0 || !canSeek;
  const selectedQuality =
    availableAudioQualities.find(
      (quality) => quality.url === currentTrack?.streamUrl
    ) ||
    availableAudioQualities.find(
      (quality) => quality.label === selectedQualityLabel
    ) ||
    availableAudioQualities.find((quality) => quality.isDefault) ||
    availableAudioQualities[0] ||
    null;
  const effectiveSelectedQualityLabel = selectedQuality?.label || "";
  const effectiveSelectedQualityUrl = selectedQuality?.url || "";
  const selectedQualityText = selectedQuality
    ? `${formatQualityLabel(selectedQuality.label)}${selectedQuality.bitrate ? ` - ${selectedQuality.bitrate} kbps` : ""}`
    : formatQualityLabel(selectedQualityLabel);
  const repeatButtonLabel =
    repeatMode === "one"
      ? "Lặp lại một bài"
      : repeatMode === "all"
        ? "Lặp lại hàng chờ"
        : "Tắt lặp lại";

  const handleOpenLyrics = () => {
    setIsMobileMenuOpen(false);
    setIsMobileQueueOpen(false);
    setIsMobileQualityOpen(false);
    setIsDesktopQueueOpen(false);
    setIsDesktopQualityOpen(false);
    navigate(routePaths.lyrics);
  };

  const handleToggleDesktopQueue = () => {
    setIsDesktopQueueOpen((currentValue) => {
      const nextValue = !currentValue;

      if (nextValue) {
        setIsDesktopQualityOpen(false);
      }

      return nextValue;
    });
  };

  const handleToggleDesktopQuality = () => {
    setIsDesktopQualityOpen((currentValue) => {
      const nextValue = !currentValue;

      if (nextValue) {
        setIsDesktopQueueOpen(false);
      }

      return nextValue;
    });
  };

  const handleToggleMobileMenu = () => {
    setIsMobileMenuOpen((currentValue) => {
      const nextValue = !currentValue;

      if (!nextValue) {
        setIsMobileQueueOpen(false);
        setIsMobileQualityOpen(false);
      }

      return nextValue;
    });
  };

  const handleToggleMobileQueue = () => {
    setIsMobileQueueOpen((currentValue) => {
      const nextValue = !currentValue;

      if (nextValue) {
        setIsMobileQualityOpen(false);
      }

      return nextValue;
    });
  };

  const handleToggleMobileQuality = () => {
    setIsMobileQualityOpen((currentValue) => {
      const nextValue = !currentValue;

      if (nextValue) {
        setIsMobileQueueOpen(false);
      }

      return nextValue;
    });
  };

  const handleRemoveTrackFromQueue = async (targetIndex) => {
    if (removingQueueTrackIndex >= 0) {
      return;
    }

    setRemovingQueueTrackIndex(targetIndex);

    try {
      await removeTrackFromQueue(targetIndex);
    } finally {
      setRemovingQueueTrackIndex(-1);
    }
  };

  const handlePlayQueueTrack = async (targetIndex) => {
    if (targetIndex === currentIndex) {
      await togglePlayPause();
      return;
    }

    await playFromQueueIndex(targetIndex);
  };

  const handleSelectQuality = async (nextQuality) => {
    if (isChangingQuality) {
      return;
    }

    setIsChangingQuality(true);
    setPendingQualityUrl(nextQuality?.url || "");

    try {
      await changeAudioQuality(nextQuality);
      setIsDesktopQualityOpen(false);
      setIsMobileQualityOpen(false);
    } finally {
      setIsChangingQuality(false);
      setPendingQualityUrl("");
    }
  };

  const renderDesktopQualitySelector = () => {
    if (!hasQualitySelector) {
      return null;
    }

    return (
      <div className="relative" ref={ desktopQualityMenuRef }>
        <button
          type="button"
          onClick={ handleToggleDesktopQuality }
          className={ utilityButtonClassName }
          aria-label="Mở menu chất lượng âm thanh"
          title={ `Chất lượng âm thanh: ${selectedQualityText}` }
          aria-expanded={ isDesktopQualityOpen }
          aria-haspopup="menu"
        >
          { isChangingQuality ? (
            <LoaderCircle className="h-[18px] w-[18px] animate-spin text-[#f5b66f]" />
          ) : (
            <Settings2 className="h-[18px] w-[18px]" />
          ) }
        </button>

        { isDesktopQualityOpen ? (
          <div className="absolute bottom-full right-0 z-20 mb-3 w-[min(20rem,calc(100vw-2rem))]">
            <PlayerQualityMenu
              qualities={ availableAudioQualities }
              selectedQualityLabel={ effectiveSelectedQualityLabel }
              selectedQualityUrl={ effectiveSelectedQualityUrl }
              pendingQualityUrl={ pendingQualityUrl }
              isChangingQuality={ isChangingQuality }
              onSelectQuality={ handleSelectQuality }
              onClose={ () => setIsDesktopQualityOpen(false) }
            />
          </div>
        ) : null }
      </div>
    );
  };

  const renderMobileQualitySelector = () => {
    if (!hasQualitySelector) {
      return null;
    }

    return (
      <>
        <button
          type="button"
          onClick={ handleToggleMobileQuality }
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-[#f7f1ea] transition hover:bg-[#241f28]"
          aria-expanded={ isMobileQualityOpen }
          aria-haspopup="menu"
        >
          <Settings2 className="h-4 w-4" />
          <span>Chất lượng</span>
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-[#b8b0aa]">
            <span className="truncate">{ selectedQualityText }</span>
            { isChangingQuality ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin text-[#f5b66f]" />
            ) : isMobileQualityOpen ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            ) }
          </span>
        </button>

        { isMobileQualityOpen ? (
          <div className="mt-2">
            <PlayerQualityMenu
              qualities={ availableAudioQualities }
              selectedQualityLabel={ effectiveSelectedQualityLabel }
              selectedQualityUrl={ effectiveSelectedQualityUrl }
              pendingQualityUrl={ pendingQualityUrl }
              isChangingQuality={ isChangingQuality }
              onSelectQuality={ handleSelectQuality }
              className="max-h-[22rem] overflow-hidden p-2"
            />
          </div>
        ) : null }
      </>
    );
  };

  const renderDesktopUtilityButtons = (className = "") => (
    <div className={ className }>
      <div className="relative" ref={ desktopQueueMenuRef }>
        <button
          type="button"
          onClick={ handleToggleDesktopQueue }
          className={ utilityButtonClassName }
          aria-label="Mở hàng chờ"
          title="Mở hàng chờ"
          aria-expanded={ isDesktopQueueOpen }
        >
          <ListMusic className="h-[18px] w-[18px]" />
        </button>

        { isDesktopQueueOpen ? (
          <div className="absolute bottom-full right-0 z-20 mb-3 w-[min(20rem,calc(100vw-2rem))]">
            <PlayerQueueMenu
              queue={ queue }
              currentIndex={ currentIndex }
              isPlaying={ isPlaying }
              onPlayTrack={ handlePlayQueueTrack }
              onRemoveTrack={ handleRemoveTrackFromQueue }
              removingTrackIndex={ removingQueueTrackIndex }
              onClose={ () => setIsDesktopQueueOpen(false) }
            />
          </div>
        ) : null }
      </div>

      <button
        type="button"
        onClick={ handleOpenLyrics }
        disabled={ queue.length === 0 }
        className={ utilityButtonClassName }
        aria-label="Mở trang lời bài hát"
        title="Mở trang lời bài hát"
      >
        <Mic2 className="h-[18px] w-[18px]" />
      </button>

      { renderDesktopQualitySelector() }
    </div>
  );

  return (
    <footer
      className={[
        `
        fixed inset-x-0 bottom-0 z-30
        grid grid-cols-1 gap-1.5
        border-t border-white/10
        bg-zinc-800/95 px-3 py-1.5 text-white shadow-[0_-10px_28px_rgba(0,0,0,0.24)]
        backdrop-blur-2xl backdrop-saturate-150
        dark:bg-[#1b161d]/95 dark:text-[#f7f1ea]
        sm:gap-2 sm:px-4 sm:py-2
        sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center
        lg:grid-cols-[minmax(0,1fr)_minmax(320px,360px)_minmax(0,1fr)] lg:px-4
        lg:transition-[left] lg:duration-300
      `,
        isDesktopSidebarVisible
          ? "lg:left-[285px]"
          : "lg:left-[84px]",
      ].join(" ")}
    >
      <div className="flex items-center gap-1.5 sm:hidden">
        <div className="flex items-center">
          { currentTrack?.image ? (
            <img
              src={ currentTrack.image }
              alt={ currentTrack.title }
              className="h-8 w-8 shrink-0 rounded-md object-cover shadow-[0_8px_16px_rgba(0,0,0,0.2)]"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/8 text-xs font-semibold text-white/80">
              { currentTrack?.title?.charAt(0)?.toUpperCase() || "M" }
            </div>
          ) }
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium leading-4 text-[#fff7ef]">
            { currentTrack?.title || "Chưa chọn bài hát" }
          </p>
          <p className="truncate text-[10px] leading-4 text-[#d7c9bc]">
            { currentTrack?.artistName || queueLabel }
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={ playPrevious }
            disabled={ queue.length === 0 }
            className={ `${controlButtonClassName} h-6 w-6` }
            aria-label="Bài trước"
          >
            <SkipBack className="h-3 w-3 fill-current text-white" />
          </button>

          <button
            type="button"
            onClick={ togglePlayPause }
            disabled={ queue.length === 0 }
            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-black transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={ isPlaying ? "Tạm dừng phát" : "Phát nhạc" }
          >
            { isBuffering ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-3 w-3 fill-current" />
            ) : (
              <Play className="h-3 w-3 fill-current" />
            ) }
          </button>

          <button
            type="button"
            onClick={ playNext }
            disabled={ !canPlayNext }
            className={ `${controlButtonClassName} h-6 w-6` }
            aria-label="Bài tiếp theo"
          >
            <SkipForward className="h-3 w-3 fill-current text-white" />
          </button>
        </div>

        <div className="relative shrink-0" ref={ mobileMenuRef }>
          <button
            type="button"
            onClick={ handleToggleMobileMenu }
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[#fff7ef] transition hover:bg-[#2b252f]"
            aria-label="Mở menu trình phát"
            title="Menu trình phát"
            aria-expanded={ isMobileMenuOpen }
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>

          { isMobileMenuOpen ? (
            <div className="absolute bottom-full right-0 z-10 mb-2 w-56 rounded-2xl border border-white/10 bg-[#151218]/95 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.32)] backdrop-blur-xl">
              <button
                type="button"
                onClick={ handleToggleMobileQueue }
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-[#f7f1ea] transition hover:bg-[#241f28]"
                aria-expanded={ isMobileQueueOpen }
              >
                <ListMusic className="h-4 w-4" />
                <span>Hàng chờ</span>
                <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-[#b8b0aa]">
                  { queue.length }
                  { isMobileQueueOpen ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) }
                </span>
              </button>

              { isMobileQueueOpen ? (
                <div className="mt-2">
                  <PlayerQueueMenu
                    queue={ queue }
                    currentIndex={ currentIndex }
                    isPlaying={ isPlaying }
                    onPlayTrack={ handlePlayQueueTrack }
                    onRemoveTrack={ handleRemoveTrackFromQueue }
                    removingTrackIndex={ removingQueueTrackIndex }
                    className="max-h-[22rem] overflow-hidden p-2"
                  />
                </div>
              ) : null }

              <button
                type="button"
                onClick={ handleOpenLyrics }
                disabled={ queue.length === 0 }
                className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-[#f7f1ea] transition hover:bg-[#241f28] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Mic2 className="h-4 w-4" />
                <span>Lời bài hát</span>
              </button>

              <button
                type="button"
                onClick={ toggleShuffle }
                className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-[#f7f1ea] transition hover:bg-[#241f28]"
                aria-pressed={ isShuffleEnabled }
              >
                <Shuffle className={ `h-4 w-4 ${isShuffleEnabled ? "text-[#f5b66f]" : ""}` } />
                <span>Phát ngẫu nhiên</span>
                <span className="ml-auto text-[11px] text-[#b8b0aa]">
                  { isShuffleEnabled ? "Bật" : "Tắt" }
                </span>
              </button>

              <button
                type="button"
                onClick={ cycleRepeatMode }
                className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-[#f7f1ea] transition hover:bg-[#241f28]"
                aria-label={ repeatButtonLabel }
              >
                { repeatMode === "one" ? (
                  <Repeat1 className="h-4 w-4 text-[#f5b66f]" />
                ) : (
                  <Repeat
                    className={ `h-4 w-4 ${repeatMode === "all" ? "text-[#f5b66f]" : ""}` }
                  />
                ) }
                <span>Lặp lại</span>
                <span className="ml-auto text-[11px] text-[#b8b0aa]">
                  { repeatMode === "one"
                    ? "Một bài"
                    : repeatMode === "all"
                      ? "Tất cả"
                      : "Tắt" }
                </span>
              </button>

              { renderMobileQualitySelector() }
            </div>
          ) : null }
        </div>
      </div>

      <div className="flex w-full min-w-0 items-center gap-1.5 text-[10px] text-[#d7c9bc] sm:hidden">
        <span className="w-7 shrink-0 text-right">
          { formatTrackDuration(Math.floor(progressValue)) }
        </span>

        <input
          type="range"
          min="0"
          max={ progressMax }
          step="0.1"
          value={ progressValue }
          disabled={ progressDisabled }
          onChange={ (event) => seekTo(event.target.value) }
          title={ canSeek ? "Tua đến vị trí phát" : "Cần Premium để tua" }
          style={ {
            "--progress": `${progressPercent}%`,
            "--range-color": "#f5b66f",
          } }
          className={ [
            "custom-range h-1 flex-1 appearance-none rounded-full disabled:cursor-not-allowed",
            canSeek ? "cursor-pointer" : "cursor-not-allowed opacity-60",
          ].join(" ") }
        />

        <span className="w-7 shrink-0">
          { formatTrackDuration(Math.floor(duration || 0)) }
        </span>
      </div>

      { restrictionMessage ? (
        <p className="truncate text-[9px] text-[#f5d08a] sm:hidden">{ restrictionMessage }</p>
      ) : null }
      { errorMessage ? (
        <p className="truncate text-[9px] text-[#fca5a5] sm:hidden">{ errorMessage }</p>
      ) : null }

      <div className="hidden min-w-0 items-start gap-2.5 sm:flex sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          { currentTrack?.image ? (
            <img
              src={ currentTrack.image }
              alt={ currentTrack.title }
              className="h-10 w-10 rounded-lg object-cover shadow-[0_12px_22px_rgba(0,0,0,0.22)]"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/8 text-sm font-semibold text-white/80">
              { currentTrack?.title?.charAt(0)?.toUpperCase() || "M" }
            </div>
          ) }

          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-[13px] font-semibold leading-4 text-[#fff7ef]">
              { currentTrack?.title || "Chưa chọn bài hát" }
            </p>
            <p className="truncate text-[11px] leading-4 text-[#d7c9bc]">
              { currentTrack?.artistName || queueLabel }
            </p>
            <p className="mt-0.5 truncate text-[10px] text-[#b8ab9e]">
              { queue.length > 0
                ? `${currentIndex + 1}/${queue.length} trong hàng chờ`
                : queueLabel }
            </p>
            { restrictionMessage ? (
              <p className="mt-0.5 truncate text-[10px] text-[#f5d08a]">{ restrictionMessage }</p>
            ) : null }
            { errorMessage ? (
              <p className="mt-0.5 truncate text-[10px] text-[#fca5a5]">{ errorMessage }</p>
            ) : null }
          </div>
        </div>
      </div>

      <div className="hidden min-w-0 flex-col gap-1.5 sm:flex sm:gap-2 lg:justify-self-center lg:w-full lg:max-w-[360px]">
        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={ toggleShuffle }
            className={ `${modeButtonClassName(isShuffleEnabled)} ${desktopModeButtonSizeClassName}` }
            aria-label="Bật/tắt phát ngẫu nhiên"
            aria-pressed={ isShuffleEnabled }
            title={ isShuffleEnabled ? "Đang bật phát ngẫu nhiên" : "Đang tắt phát ngẫu nhiên" }
          >
            <Shuffle className={ desktopModeIconSizeClassName } />
          </button>

          <button
            type="button"
            onClick={ playPrevious }
            disabled={ queue.length === 0 }
            className={ `${controlButtonClassName} h-7 w-7 sm:h-8 sm:w-8` }
            aria-label="Bài trước"
          >
            <SkipBack className="h-[14px] w-[14px] fill-current text-white" />
          </button>

          <button
            type="button"
            onClick={ togglePlayPause }
            disabled={ queue.length === 0 }
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-black transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:w-9"
            aria-label={ isPlaying ? "Tạm dừng phát" : "Phát nhạc" }
          >
            { isBuffering ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-3.5 w-3.5 fill-current" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            ) }
          </button>

          <button
            type="button"
            onClick={ playNext }
            disabled={ !canPlayNext }
            className={ `${controlButtonClassName} h-7 w-7 sm:h-8 sm:w-8` }
            aria-label="Bài tiếp theo"
          >
            <SkipForward className="h-[14px] w-[14px] fill-current text-white" />
          </button>

          <button
            type="button"
            onClick={ cycleRepeatMode }
            className={ `${modeButtonClassName(repeatMode !== "off")} ${desktopModeButtonSizeClassName}` }
            aria-label={ repeatButtonLabel }
            title={ repeatButtonLabel }
          >
            { repeatMode === "one" ? (
              <Repeat1 className={ desktopModeIconSizeClassName } />
            ) : (
              <Repeat className={ desktopModeIconSizeClassName } />
            ) }
          </button>
        </div>

        <div className="flex w-full min-w-0 items-center gap-2 text-[10px] text-[#d7c9bc] sm:max-w-[23rem] sm:gap-2.5">
          <span className="w-7 shrink-0 text-right sm:w-8">
            { formatTrackDuration(Math.floor(progressValue)) }
          </span>

          <input
            type="range"
            min="0"
            max={ progressMax }
            step="0.1"
            value={ progressValue }
            disabled={ progressDisabled }
            onChange={ (event) => seekTo(event.target.value) }
            title={ canSeek ? "Tua đến vị trí phát" : "Cần Premium để tua" }
            style={ {
              "--progress": `${progressPercent}%`,
              "--range-color": "#f5b66f",
            } }
            className={ [
              "custom-range h-1 flex-1 appearance-none rounded-full disabled:cursor-not-allowed",
              canSeek ? "cursor-pointer" : "cursor-not-allowed opacity-60",
            ].join(" ") }
          />
          <span className="w-7 shrink-0 sm:w-8">
            { formatTrackDuration(Math.floor(duration || 0)) }
          </span>
        </div>
      </div>

      <div className="hidden min-w-0 flex-col gap-2 sm:col-span-2 sm:flex sm:items-end lg:col-span-1 lg:justify-self-end lg:w-full lg:max-w-[220px] lg:justify-center">
        { renderDesktopUtilityButtons("flex items-center justify-between gap-2 lg:justify-end") }

        <div className="flex items-center gap-2.5 text-[11px] text-[#d7c9bc]">
          <span className="inline-flex shrink-0 items-center gap-2 text-[#fff7ef]">
            { volumePercent === 0 ? (
              <VolumeX className="h-3.5 w-3.5 text-[#f5b66f]" />
            ) : (
                <Volume2 className="h-3.5 w-3.5 text-white" />
            ) }
          </span>

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={ volume }
            onChange={ (event) => setVolumeLevel(event.target.value) }
            style={ {
              "--progress": `${volume * 100}%`,
              "--range-color": "#e40c7fff",
            } }
            className="
              custom-range
              h-1
              w-full
              cursor-pointer
              appearance-none
              rounded-full
            "
          />
          <span className="w-8 shrink-0 text-right">{ volumePercent }%</span>
        </div>
      </div>
    </footer>
  );
};

export default Player;
