import {
  ArrowLeft,
  LoaderCircle,
} from "lucide-react";
import {
  useEffect,
  useRef,
} from "react";
import { Link } from "react-router-dom";
import { usePlayer } from "../../hooks/usePlayer";
import { routePaths } from "../../routes/routePaths";
import { getLyricsThemeByIndex } from "../../utils/lyricsTheme";

const LyricsPage = () => {
  const {
    currentTrack,
    lyricsLines,
    activeLyricLineIndex,
    activeLyricWordIndex,
    isLyricsLoading,
    lyricsErrorMessage,
  } = usePlayer();
  const activeLyricLineRef = useRef(null);

  useEffect(() => {
    if (!activeLyricLineRef.current) {
      return;
    }

    activeLyricLineRef.current.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
  }, [activeLyricLineIndex, currentTrack?.id]);

  const hasLyrics = lyricsLines.length > 0;
  const hasLyricsSource = Boolean(currentTrack?.lyricsSyncUrl);
  const trackTitle = currentTrack?.title || "No track selected";
  const trackArtistName = currentTrack?.artistName || "Unknown artist";
  const lyricTheme = getLyricsThemeByIndex(currentTrack?.lyricsThemeIndex);

  return (
    <section className="flex w-full max-w-6xl flex-col gap-4">
      <div className="flex items-center justify-between gap-1">
        <Link
          to={ routePaths.home }
          className="inline-flex items-center 
          gap-2 rounded-full bg-gradient-to-br 
          from-[#ff8a3d] via-[#ff4fd8] to-[#7b61ff] px-3 
          py-2 text-sm font-medium text-inherit"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Link>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,2.0fr)_minmax(260px,0.9fr)]">
        <div
          className="rounded-[13px] border sm:p-7"
          style={{
            backgroundColor: lyricTheme.background,
            borderColor: lyricTheme.border,
            boxShadow: lyricTheme.shadow,
          }}
        >
          <div className="max-h-[55vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            { !currentTrack ? (
              <p
                className="text-base leading-8"
                style={{ color: lyricTheme.emptyText }}
              >
                No track is playing right now.
              </p>
            ) : isLyricsLoading ? (
              <div
                className="flex items-center gap-3 text-base"
                style={{ color: lyricTheme.supportText }}
              >
                <LoaderCircle className="h-5 w-5 animate-spin" />
                <span>Loading synced lyrics...</span>
              </div>
            ) : lyricsErrorMessage ? (
              <p className="text-base leading-8 text-[#fca5a5]">{ lyricsErrorMessage }</p>
            ) : !hasLyricsSource ? (
              <p
                className="text-base leading-8"
                style={{ color: lyricTheme.emptyText }}
              >
                This track does not have a `lyricsSyncUrl` yet.
              </p>
            ) : !hasLyrics ? (
              <p
                className="text-base leading-8"
                style={{ color: lyricTheme.emptyText }}
              >
                Synced lyrics were loaded, but the LRC file has no lyric lines.
              </p>
            ) : (
              <div className="space-y-3 pb-8 pt-2">
                { lyricsLines.map((line, index) => {
                  const isActive = index === activeLyricLineIndex;

                  return (
                    <p
                      key={ `${line.time}-${index}` }
                      ref={ isActive ? activeLyricLineRef : null }
                      className={
                        isActive
                          ? "text-3xl font-semibold leading-10 sm:text-3xl sm:leading-[3rem]"
                          : "text-2xl font-medium leading-9"
                      }
                      style={{
                        color: isActive ? lyricTheme.primaryText : lyricTheme.secondaryText,
                      }}
                    >
                      { isActive && Array.isArray(line.words) && line.words.length > 0
                        ? line.words.map((word, wordIndex) => (
                          <span
                            key={ `${line.time}-${word.time}-${wordIndex}` }
                            style={{
                              color:
                                wordIndex === activeLyricWordIndex
                                  ? lyricTheme.accentText
                                  : lyricTheme.primaryText,
                            }}
                          >
                            { word.text }{ " " }
                          </span>
                        ))
                        : line.text }
                    </p>
                  );
                }) }
              </div>
            ) }
          </div>
        </div>

        <aside className="h-fit rounded-[13px] border border-white/10 bg-white/[0.03] p-5 lg:sticky lg:top-6">
          <div className="mt-3 space-y-3">
            { currentTrack?.image ? (
              <img
                src={ currentTrack.image }
                alt={ trackTitle }
                className="aspect-square w-full rounded-[16px] object-cover shadow-[0_20px_45px_rgba(0,0,0,0.28)]"
              />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center rounded-[18px] bg-white/5 text-5xl font-semibold uppercase text-[#f5e7d6] shadow-[0_20px_45px_rgba(0,0,0,0.2)]">
                { trackTitle.charAt(0) || "M" }
              </div>
            ) }

            <div className="space-y-2">
              <h2 className="text-2xl font-semibold leading-tight text-white">
                { trackTitle }
              </h2>
              <p className="text-sm leading-6 text-[#ccbfb2]">
                { trackArtistName }
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default LyricsPage;
