import { ArrowLeft, Expand, Mic2, Radio } from "lucide-react";
import { Link } from "react-router-dom";
import SyncedLyrics from "../../components/lyrics/SyncedLyrics";
import { usePlayer } from "../../hooks/usePlayer";
import { routePaths } from "../../routes/routePaths";
import { getLyricsThemeByIndex } from "../../utils/lyricsTheme";

const LyricsPage = () => {
  const { currentTrack, isPlaying } = usePlayer();
  const trackTitle = currentTrack?.title || "Chưa chọn bài hát";
  const trackArtistName = currentTrack?.artistName || "Nghệ sĩ chưa xác định";
  const lyricTheme = getLyricsThemeByIndex(currentTrack?.lyricsThemeIndex);

  return (
    <section className="relative h-full min-h-0 w-full overflow-hidden">
      <div
        className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full opacity-35 blur-[100px]"
        style={{ backgroundColor: lyricTheme.accentText }}
      />

      <div className="relative h-full min-h-0 w-full">
        <div
          className="relative isolate flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-white/15 shadow-2xl"
          style={{
            backgroundColor: lyricTheme.background,
            boxShadow: lyricTheme.shadow,
          }}
        >
          {currentTrack?.image ? (
            <div
              className="pointer-events-none absolute inset-0 -z-20 bg-cover bg-center opacity-20 blur-3xl scale-110"
              style={{ backgroundImage: `url(${currentTrack.image})` }}
            />
          ) : null}
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-black/5 via-transparent to-black/45" />

          <header className="flex shrink-0 flex-nowrap items-center justify-between gap-2 overflow-hidden border-b border-white/10 px-3 py-3 sm:gap-3 sm:px-6 sm:py-4">
            <Link
              to={routePaths.home}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/25 px-3 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:border-white/50 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              Quay lại
            </Link>

            <Link
              to={routePaths.lyricsFullscreen}
              className="inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/25 px-3 py-2 text-xs font-bold text-white transition hover:scale-[1.02] hover:border-white/50 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
            >
              <Expand className="h-4 w-4 shrink-0" />
              Toàn màn hình
            </Link>
          </header>

          <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1.8fr)_minmax(230px,0.72fr)] lg:grid-rows-1">
            <main className="min-h-0 overflow-hidden">
              <SyncedLyrics theme={lyricTheme} />
            </main>

            <aside className="flex border-t border-white/10 p-4 sm:p-5 lg:flex-col lg:justify-between lg:border-l lg:border-t-0 lg:p-7">
              <div className="flex min-w-0 flex-1 items-center gap-4 lg:block">
                {currentTrack?.image ? (
                  <img
                    src={currentTrack.image}
                    alt={trackTitle}
                    className="h-20 w-20 shrink-0 rounded-xl object-cover shadow-[0_24px_55px_rgba(0,0,0,0.35)] sm:h-24 sm:w-24 lg:aspect-square lg:h-auto lg:w-full lg:rounded-2xl"
                  />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-white/10 sm:h-24 sm:w-24 lg:aspect-square lg:h-auto lg:w-full lg:rounded-2xl">
                    <Mic2 className="h-10 w-10 text-white/70" />
                  </div>
                )}

                <div className="min-w-0 lg:mt-6">
                  <div className="mb-3 hidden items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-white/65 lg:flex">
                    <Radio className={`h-3.5 w-3.5 ${isPlaying ? "animate-pulse" : ""}`} />
                    {isPlaying ? "Đang phát" : "Đang tạm dừng"}
                  </div>
                  <h1 className="truncate text-xl font-bold tracking-[-0.03em] text-white sm:text-2xl lg:whitespace-normal lg:text-4xl">
                    {trackTitle}
                  </h1>
                  <p className="mt-2 truncate text-sm font-medium text-white/65 sm:text-base lg:whitespace-normal">
                    {trackArtistName}
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LyricsPage;
