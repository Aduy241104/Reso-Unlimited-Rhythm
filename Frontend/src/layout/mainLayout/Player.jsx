import { useEffect, useRef, useState } from "react";
import {
  ListMusic,
  LoaderCircle,
  Mic2,
  MoreHorizontal,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "../../hooks/usePlayer";
import { routePaths } from "../../routes/routePaths";
import { formatTrackDuration } from "../../utils/albumDetail";

const controlButtonClassName =
  "inline-flex h-10 w-10 items-center justify-center rounded-full text-[#fff7ef] transition hover:bg-[#2b252f] disabled:cursor-not-allowed disabled:opacity-40";

const utilityButtonClassName =
  "inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#fff7ef] transition hover:bg-[#2b252f] disabled:cursor-not-allowed disabled:opacity-40";

const Player = ({ isDesktopSidebarVisible = true }) => {
  const navigate = useNavigate();
  const mobileMenuRef = useRef(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
    activeCollection,
    togglePlayPause,
    playNext,
    playPrevious,
    seekTo,
    setVolumeLevel,
  } = usePlayer();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const queueLabel = activeCollection?.title
    ? `${activeCollection.type === "playlist" ? "Playlist" : "Album"}: ${activeCollection.title}`
    : queue.length > 0
      ? `Queue: ${currentIndex + 1}/${queue.length}`
      : "Choose a track to start streaming";

  const progressMax = duration > 0 ? duration : 0;
  const progressValue = duration > 0 ? Math.min(currentTime, duration) : 0;
  const progressPercent =
    progressMax > 0 ? Math.min((progressValue / progressMax) * 100, 100) : 0;
  const volumePercent = Math.round(volume * 100);

  const handleOpenLyrics = () => {
    setIsMobileMenuOpen(false);
    navigate(routePaths.lyrics);
  };

  const renderDesktopUtilityButtons = (className = "") => (
    <div className={ className }>
      <button
        type="button"
        className={ utilityButtonClassName }
        aria-label="Open queue"
        title="Queue coming soon"
      >
        <ListMusic className="h-[18px] w-[18px]" />
      </button>

      <button
        type="button"
        onClick={ handleOpenLyrics }
        disabled={ queue.length === 0 }
        className={ utilityButtonClassName }
        aria-label="Open lyrics page"
        title="Open lyrics page"
      >
        <Mic2 className="h-[18px] w-[18px]" />
      </button>
    </div>
  );

  return (
    <footer
      className={[
        `
        fixed bottom-2 left-1/2 z-30
        w-[calc(100%-1rem)] max-w-[980px] -translate-x-1/2
        grid grid-cols-1 gap-2.5
        rounded-2xl
        bg-zinc-700/90 px-3 py-3 text-white shadow-[0_20px_60px_rgba(0,0,0,0.25)]
        backdrop-blur-2xl backdrop-saturate-150
        dark:border-[#f5b66f]/20 dark:bg-[#1b161d]/92 dark:text-[#f7f1ea]
        sm:bottom-4 sm:w-[calc(100%-1.5rem)] sm:gap-4 sm:px-4
        sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center
        lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,0.95fr)] lg:max-w-[1120px] lg:px-6
        lg:transition-[left,width] lg:duration-300
      `,
        isDesktopSidebarVisible
          ? "lg:left-[calc(50%+142.5px)] lg:w-[calc(100%-317px)]"
          : "lg:left-[calc(50%+42px)] lg:w-[calc(100%-116px)]",
      ].join(" ")}
    >
      <div className="flex items-center gap-2 sm:hidden">
        <div className="flex items-center">
          { currentTrack?.image ? (
            <img
              src={ currentTrack.image }
              alt={ currentTrack.title }
              className="h-10 w-10 shrink-0 rounded-lg object-cover shadow-[0_12px_24px_rgba(0,0,0,0.24)]"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/8 text-sm font-semibold text-white/80">
              { currentTrack?.title?.charAt(0)?.toUpperCase() || "M" }
            </div>
          ) }
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={ playPrevious }
            disabled={ queue.length === 0 }
            className={ `${controlButtonClassName} h-8 w-8` }
            aria-label="Previous track"
          >
            <SkipBack className="h-[14px] w-[14px] fill-current text-white" />
          </button>

          <button
            type="button"
            onClick={ togglePlayPause }
            disabled={ queue.length === 0 }
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={ isPlaying ? "Pause playback" : "Play playback" }
          >
            { isBuffering ? (
              <LoaderCircle className="h-4.5 w-4.5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-4 w-4 fill-current" />
            ) : (
              <Play className="h-4 w-4 fill-current" />
            ) }
          </button>

          <button
            type="button"
            onClick={ playNext }
            disabled={ currentIndex < 0 || currentIndex >= queue.length - 1 }
            className={ `${controlButtonClassName} h-8 w-8` }
            aria-label="Next track"
          >
            <SkipForward className="h-[14px] w-[14px] fill-current text-white" />
          </button>
        </div>

        <div className="relative shrink-0" ref={ mobileMenuRef }>
          <button
            type="button"
            onClick={ () => setIsMobileMenuOpen((currentValue) => !currentValue) }
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#fff7ef] transition hover:bg-[#2b252f]"
            aria-label="Open lyrics and queue menu"
            title="Lyrics and queue"
            aria-expanded={ isMobileMenuOpen }
          >
            <MoreHorizontal className="h-4.5 w-4.5" />
          </button>

          { isMobileMenuOpen ? (
            <div className="absolute bottom-full right-0 z-10 mb-2 w-44 rounded-2xl border border-white/10 bg-[#151218]/95 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.32)] backdrop-blur-xl">
              <button
                type="button"
                onClick={ () => setIsMobileMenuOpen(false) }
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-[#f7f1ea] transition hover:bg-[#241f28]"
              >
                <ListMusic className="h-4 w-4" />
                <span>Queue</span>
                <span className="ml-auto text-[11px] text-[#b8b0aa]">Soon</span>
              </button>

              <button
                type="button"
                onClick={ handleOpenLyrics }
                disabled={ queue.length === 0 }
                className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-[#f7f1ea] transition hover:bg-[#241f28] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Mic2 className="h-4 w-4" />
                <span>Lyrics</span>
              </button>
            </div>
          ) : null }
        </div>
      </div>

      <div className="flex w-full min-w-0 items-center gap-2 text-[11px] text-[#d7c9bc] sm:hidden">
        <span className="w-8 shrink-0 text-right">
          { formatTrackDuration(Math.floor(progressValue)) }
        </span>

        <input
          type="range"
          min="0"
          max={ progressMax }
          step="0.1"
          value={ progressValue }
          disabled={ progressMax === 0 }
          onChange={ (event) => seekTo(event.target.value) }
          style={ {
            "--progress": `${progressPercent}%`,
            "--range-color": "#f5b66f",
          } }
          className="
            custom-range
            h-1.5
            flex-1
            cursor-pointer
            appearance-none
            rounded-full
            disabled:cursor-not-allowed
          "
        />

        <span className="w-8 shrink-0">
          { formatTrackDuration(Math.floor(duration || 0)) }
        </span>
      </div>

      { errorMessage ? (
        <p className="truncate text-[11px] text-[#fca5a5] sm:hidden">{ errorMessage }</p>
      ) : null }

      <div className="hidden min-w-0 items-start gap-3 sm:flex sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          { currentTrack?.image ? (
            <img
              src={ currentTrack.image }
              alt={ currentTrack.title }
              className="h-14 w-14 rounded-xl object-cover shadow-[0_16px_30px_rgba(0,0,0,0.28)]"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/8 text-lg font-semibold text-white/80">
              { currentTrack?.title?.charAt(0)?.toUpperCase() || "M" }
            </div>
          ) }

          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-semibold text-[#fff7ef] sm:text-base">
              { currentTrack?.title || "No track selected" }
            </p>
            <p className="truncate text-xs text-[#d7c9bc] sm:text-sm">
              { currentTrack?.artistName || queueLabel }
            </p>
            <p className="mt-1 truncate text-[11px] text-[#b8ab9e]">
              { queue.length > 0
                ? `${currentIndex + 1}/${queue.length} in queue`
                : queueLabel }
            </p>
            { errorMessage ? (
              <p className="mt-1 truncate text-[11px] text-[#fca5a5]">{ errorMessage }</p>
            ) : null }
          </div>
        </div>
      </div>

      <div className="hidden min-w-0 flex-col gap-2.5 sm:flex sm:gap-3">
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={ playPrevious }
            disabled={ queue.length === 0 }
            className={ `${controlButtonClassName} h-9 w-9 sm:h-10 sm:w-10` }
            aria-label="Previous track"
          >
            <SkipBack className="h-[16px] w-[16px] fill-current text-white" />
          </button>

          <button
            type="button"
            onClick={ togglePlayPause }
            disabled={ queue.length === 0 }
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-black transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:w-11"
            aria-label={ isPlaying ? "Pause playback" : "Play playback" }
          >
            { isBuffering ? (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-4 w-4 fill-current" />
            ) : (
              <Play className="h-4 w-4 fill-current" />
            ) }
          </button>

          <button
            type="button"
            onClick={ playNext }
            disabled={ currentIndex < 0 || currentIndex >= queue.length - 1 }
            className={ `${controlButtonClassName} h-9 w-9 sm:h-10 sm:w-10` }
            aria-label="Next track"
          >
            <SkipForward className="h-[16px] w-[16px] fill-current text-white" />
          </button>
        </div>

        <div className="flex w-full min-w-0 items-center gap-2 text-[11px] text-[#d7c9bc] sm:max-w-[25rem] sm:gap-3 sm:text-xs">
          <span className="w-8 shrink-0 text-right sm:w-10">
            { formatTrackDuration(Math.floor(progressValue)) }
          </span>

          <input
            type="range"
            min="0"
            max={ progressMax }
            step="0.1"
            value={ progressValue }
            disabled={ progressMax === 0 }
            onChange={ (event) => seekTo(event.target.value) }
            style={ {
              "--progress": `${progressPercent}%`,
              "--range-color": "#f5b66f",
            } }
            className="
              custom-range
              h-1.5
              flex-1
              cursor-pointer
              appearance-none
              rounded-full
              disabled:cursor-not-allowed
            "
          />
          <span className="w-8 shrink-0 sm:w-10">
            { formatTrackDuration(Math.floor(duration || 0)) }
          </span>
        </div>
      </div>

      <div className="hidden min-w-0 flex-col gap-3 sm:col-span-2 sm:flex lg:col-span-1 lg:justify-self-end lg:w-full lg:max-w-[260px]">
        { renderDesktopUtilityButtons("flex items-center justify-between gap-2 lg:justify-end") }

        <div className="flex items-center gap-3 text-xs text-[#d7c9bc]">
          <span className="inline-flex shrink-0 items-center gap-2 text-[#fff7ef]">
            { volumePercent === 0 ? (
              <VolumeX className="h-4 w-4 text-[#f5b66f]" />
            ) : (
              <Volume2 className="h-4 w-4 text-[#f5b66f]" />
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
              "--range-color": "#f5b66f",
            } }
            className="
              custom-range
              h-1.5
              w-full
              cursor-pointer
              appearance-none
              rounded-full
            "
          />
          <span className="w-9 shrink-0 text-right">{ volumePercent }%</span>
        </div>
      </div>
    </footer>
  );
};

export default Player;
