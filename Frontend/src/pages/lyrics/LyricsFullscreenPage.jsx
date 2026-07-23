import {
  Expand,
  LoaderCircle,
  Mic2,
  Minimize2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SyncedLyrics from "../../components/lyrics/SyncedLyrics";
import { usePlayer } from "../../hooks/usePlayer";
import { routePaths } from "../../routes/routePaths";
import { formatTrackDuration } from "../../utils/albumDetail";
import { getLyricsThemeByIndex } from "../../utils/lyricsTheme";

const iconButtonClassName =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-md transition hover:scale-105 hover:bg-black/35 disabled:cursor-not-allowed disabled:opacity-35";

const LyricsFullscreenPage = () => {
  const navigate = useNavigate();
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(
    () => typeof document !== "undefined" && Boolean(document.fullscreenElement)
  );
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    volume,
    queue,
    currentIndex,
    repeatMode,
    canSeek,
    togglePlayPause,
    playPrevious,
    playNext,
    seekTo,
  } = usePlayer();

  const lyricTheme = getLyricsThemeByIndex(currentTrack?.lyricsThemeIndex);
  const trackTitle = currentTrack?.title || "Chưa chọn bài hát";
  const trackArtistName = currentTrack?.artistName || "Nghệ sĩ chưa xác định";
  const progressMax = duration > 0 ? duration : 0;
  const progressValue = duration > 0 ? Math.min(currentTime, duration) : 0;
  const progressPercent = progressMax > 0
    ? Math.min((progressValue / progressMax) * 100, 100)
    : 0;
  const canPlayNext = queue.length > 0
    && (currentIndex < queue.length - 1 || repeatMode === "all" || currentIndex < 0);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleFullscreenChange = () => {
      setIsNativeFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const handleClose = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
    }
    navigate(routePaths.lyrics);
  };

  const handleToggleNativeFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
      return;
    }

    const fullscreenRequest = document.documentElement.requestFullscreen?.();
    await fullscreenRequest?.catch(() => undefined);
  };

  return (
    <div
      className="relative isolate flex h-screen min-h-0 w-full flex-col overflow-hidden text-white"
      style={{ backgroundColor: lyricTheme.background }}
    >
      {currentTrack?.image ? (
        <div
          className="pointer-events-none absolute -inset-16 -z-30 scale-110 bg-cover bg-center opacity-45 blur-[70px]"
          style={{ backgroundImage: `url(${currentTrack.image})` }}
        />
      ) : null}
      <div className="pointer-events-none absolute inset-0 -z-20 bg-black/45" />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-50"
        style={{
          background: `radial-gradient(circle at 78% 32%, ${lyricTheme.background} 0%, transparent 58%), linear-gradient(90deg, rgba(0,0,0,.42), transparent 55%)`,
        }}
      />

      <header className="z-20 flex shrink-0 items-center justify-between px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] sm:px-7 lg:px-10">
        <button
          type="button"
          onClick={handleClose}
          className={iconButtonClassName}
          aria-label="Đóng chế độ toàn màn hình"
          title="Đóng"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="min-w-0 px-4 text-center lg:hidden">
          <p className="truncate text-sm font-bold">{trackTitle}</p>
          <p className="mt-0.5 truncate text-xs text-white/55">{trackArtistName}</p>
        </div>

        <button
          type="button"
          onClick={handleToggleNativeFullscreen}
          className={iconButtonClassName}
          aria-label={isNativeFullscreen ? "Thoát toàn màn hình trình duyệt" : "Mở toàn màn hình trình duyệt"}
          title={isNativeFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
        >
          {isNativeFullscreen ? <Minimize2 className="h-5 w-5" /> : <Expand className="h-5 w-5" />}
        </button>
      </header>

      <div className="grid min-h-0 flex-1 px-3 sm:px-7 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.7fr)] lg:gap-12 lg:px-10 xl:gap-20 xl:px-16">
        <main className="min-h-0 overflow-hidden">
          <SyncedLyrics theme={lyricTheme} variant="fullscreen" />
        </main>

        <aside className="hidden min-h-0 flex-col justify-center lg:flex">
          <div className="mx-auto w-full max-w-[390px]">
            {currentTrack?.image ? (
              <img
                src={currentTrack.image}
                alt={trackTitle}
                className="aspect-square w-full rounded-2xl object-cover shadow-[0_35px_90px_rgba(0,0,0,0.52)]"
              />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-white/10 shadow-[0_35px_90px_rgba(0,0,0,0.4)]">
                <Mic2 className="h-16 w-16 text-white/60" />
              </div>
            )}

            <div className="mt-7">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.24em] text-white/45">
                Đang nghe
              </p>
              <h1 className="text-4xl font-bold leading-tight tracking-[-0.035em] xl:text-5xl">
                {trackTitle}
              </h1>
              <p className="mt-2 text-lg font-medium text-white/60">{trackArtistName}</p>
            </div>
          </div>
        </aside>
      </div>

      <footer className="z-20 shrink-0 bg-gradient-to-t from-black/55 via-black/25 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-5 sm:px-8 lg:px-12 lg:pb-7">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-3 text-xs font-medium text-white/65">
            <span className="w-10 text-right">{formatTrackDuration(Math.floor(progressValue))}</span>
            <input
              type="range"
              min="0"
              max={progressMax}
              step="0.1"
              value={progressValue}
              disabled={progressMax === 0 || !canSeek}
              onChange={(event) => seekTo(event.target.value)}
              style={{
                "--progress": `${progressPercent}%`,
                "--range-color": lyricTheme.accentText,
              }}
              className="custom-range h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Tiến trình bài hát"
            />
            <span className="w-10">{formatTrackDuration(Math.floor(duration || 0))}</span>
          </div>

          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center">
            <div className="min-w-0">
              <p className="hidden truncate text-sm font-bold sm:block lg:hidden">{trackTitle}</p>
              <p className="hidden truncate text-xs text-white/50 sm:block lg:hidden">{trackArtistName}</p>
            </div>

            <div className="flex items-center justify-center gap-3 sm:gap-5">
              <button
                type="button"
                onClick={playPrevious}
                disabled={queue.length === 0}
                className="text-white/80 transition hover:scale-110 hover:text-white disabled:opacity-30"
                aria-label="Bài trước"
              >
                <SkipBack className="h-6 w-6 fill-current" />
              </button>
              <button
                type="button"
                onClick={togglePlayPause}
                disabled={queue.length === 0}
                className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-xl transition hover:scale-105 disabled:opacity-40"
                aria-label={isPlaying ? "Tạm dừng" : "Phát nhạc"}
              >
                {isBuffering ? (
                  <LoaderCircle className="h-6 w-6 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-6 w-6 fill-current" />
                ) : (
                  <Play className="ml-0.5 h-6 w-6 fill-current" />
                )}
              </button>
              <button
                type="button"
                onClick={playNext}
                disabled={!canPlayNext}
                className="text-white/80 transition hover:scale-110 hover:text-white disabled:opacity-30"
                aria-label="Bài tiếp theo"
              >
                <SkipForward className="h-6 w-6 fill-current" />
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 text-xs font-semibold text-white/55">
              <Volume2 className="h-4 w-4" />
              <span className="hidden sm:inline">{Math.round(volume * 100)}%</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LyricsFullscreenPage;
