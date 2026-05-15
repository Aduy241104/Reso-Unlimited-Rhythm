import {
  ListMusic,
  LoaderCircle,
  Mic2,
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

const Player = () => {
  const navigate = useNavigate();
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

  const queueLabel = activeCollection?.title
    ? `${activeCollection.type === "playlist" ? "Playlist" : "Album"}: ${activeCollection.title}`
    : queue.length > 0
      ? `Queue: ${currentIndex + 1}/${queue.length}`
      : "Choose a track to start streaming";

  const progressMax = duration > 0 ? duration : 0;
  const progressValue = duration > 0 ? Math.min(currentTime, duration) : 0;
  const volumePercent = Math.round(volume * 100);

  return (
    <footer
      className="
        fixed bottom-3 left-1/2 z-30
        w-[calc(100%-24px)] max-w-[980px] -translate-x-1/2
        grid grid-cols-1 gap-4
        rounded-lg
        bg-zinc-700/90 px-2 py-2 text-white shadow-[0_20px_60px_rgba(0,0,0,0.25)]
        backdrop-blur-2xl backdrop-saturate-150
        dark:border-[#f5b66f]/20 dark:bg-[#1b161d]/92 dark:text-[#f7f1ea]
        ms-[85px]
        sm:bottom-4 sm:w-[1150px] sm:max-w-[92%] sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,0.95fr)] sm:items-center sm:px-6
      "
    >
      <div className="flex min-w-0 items-center gap-3">
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

      <div className="flex min-w-0 flex-col items-center gap-3">
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={ playPrevious }
            disabled={ queue.length === 0 }
            className={ controlButtonClassName }
            aria-label="Previous track"
          >
            <SkipBack className="h-[16px] w-[16px] fill-current text-white" />
          </button>

          <button
            type="button"
            onClick={ togglePlayPause }
            disabled={ queue.length === 0 }
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-black transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
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
            className={ controlButtonClassName }
            aria-label="Next track"
          >
            <SkipForward className="h-[16px] w-[16px] fill-current text-white" />
          </button>
        </div>

        <div className="flex w-full min-w-0 items-center gap-3 text-xs text-[#d7c9bc] sm:max-w-[25rem]">
          <span className="w-10 text-right">
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
              "--progress": `${(progressValue / progressMax) * 100}%`,
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
          <span className="w-10">
            { formatTrackDuration(Math.floor(duration || 0)) }
          </span>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-3 sm:justify-self-end sm:w-full sm:max-w-[260px]">
        <div className="flex items-center justify-end gap-2">
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
            onClick={ () => navigate(routePaths.lyrics) }
            disabled={ queue.length === 0 }
            className={ utilityButtonClassName }
            aria-label="Open lyrics page"
            title="Open lyrics page"
          >
            <Mic2 className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-[#d7c9bc] ms-14">
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
