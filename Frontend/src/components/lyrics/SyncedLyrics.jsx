import { LoaderCircle, Mic2, Music2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { usePlayer } from "../../hooks/usePlayer";

const getLineOpacity = (index, activeIndex) => {
  if (activeIndex < 0) return 0.7;

  const distance = Math.abs(index - activeIndex);
  if (distance === 0) return 1;
  if (distance === 1) return 0.62;
  if (distance === 2) return 0.42;
  return 0.24;
};

const SyncedLyrics = ({
  theme,
  variant = "default",
  className = "",
}) => {
  const {
    currentTrack,
    lyricsLines,
    activeLyricLineIndex,
    activeLyricWordIndex,
    isLyricsLoading,
    lyricsErrorMessage,
    canSeek,
    seekTo,
  } = usePlayer();
  const activeLineRef = useRef(null);
  const lyricsScrollRef = useRef(null);

  useEffect(() => {
    const scrollContainer = lyricsScrollRef.current;
    const activeLine = activeLineRef.current;

    if (!scrollContainer || !activeLine || activeLyricLineIndex < 0) {
      return;
    }

    const containerRect = scrollContainer.getBoundingClientRect();
    const lineRect = activeLine.getBoundingClientRect();
    const safeTop = containerRect.top - 1;
    const safeBottom = containerRect.bottom + 1;
    const hasPassedThreeLines =
      activeLyricLineIndex > 0 && activeLyricLineIndex % 3 === 0;
    const isOutsideViewport =
      lineRect.top < safeTop || lineRect.bottom > safeBottom;

    if (!hasPassedThreeLines && !isOutsideViewport) {
      return;
    }

    const lineCenter = lineRect.top + (lineRect.height / 2);
    const focusPoint = containerRect.top + (containerRect.height * 0.32);

    scrollContainer.scrollTo({
      top: scrollContainer.scrollTop + lineCenter - focusPoint,
      behavior: "smooth",
    });
  }, [activeLyricLineIndex, currentTrack?.id, currentTrack?._id]);

  const hasLyrics = lyricsLines.length > 0;
  const hasLyricsSource = Boolean(currentTrack?.lyricsSyncUrl);
  const isFullscreen = variant === "fullscreen";

  if (!currentTrack) {
    return (
      <div className={`flex h-full min-h-full items-center justify-center ${className}`}>
        <div className="max-w-sm text-center">
          <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
            <Music2 className="h-7 w-7" style={{ color: theme.supportText }} />
          </span>
          <h2 className="text-xl font-semibold text-white">Chưa có bài hát nào đang phát</h2>
          <p className="mt-2 text-sm leading-6" style={{ color: theme.emptyText }}>
            Chọn một bài hát có lời đồng bộ để bắt đầu trải nghiệm.
          </p>
        </div>
      </div>
    );
  }

  if (isLyricsLoading) {
    return (
      <div className={`flex h-full min-h-full items-center justify-center ${className}`}>
        <div className="flex flex-col items-center gap-4" style={{ color: theme.supportText }}>
          <LoaderCircle className="h-9 w-9 animate-spin" />
          <span className="text-sm font-medium">Đang tải lời bài hát đồng bộ...</span>
        </div>
      </div>
    );
  }

  if (lyricsErrorMessage || !hasLyricsSource || !hasLyrics) {
    const message = lyricsErrorMessage
      || (!hasLyricsSource
        ? "Bài hát này chưa có lời đồng bộ."
        : "Tệp lời đồng bộ chưa có nội dung để hiển thị.");

    return (
      <div className={`flex h-full min-h-full items-center justify-center ${className}`}>
        <div className="max-w-sm text-center">
          <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
            <Mic2 className="h-7 w-7" style={{ color: theme.supportText }} />
          </span>
          <h2 className="text-xl font-semibold text-white">Chưa thể hiển thị lời bài hát</h2>
          <p className="mt-2 text-sm leading-6" style={{ color: theme.emptyText }}>
            {message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={lyricsScrollRef}
      className={[
        "h-full overflow-y-auto overscroll-contain scroll-smooth",
        "[scrollbar-color:rgba(255,255,255,0.2)_transparent] [scrollbar-width:thin]",
        className,
      ].join(" ")}
    >
      <div className={isFullscreen ? "pb-[38vh] pt-0" : "pb-[24vh] pt-0 sm:pb-[28vh]"}>
        {lyricsLines.map((line, index) => {
          const isActive = index === activeLyricLineIndex;
          const words = Array.isArray(line.words) ? line.words : [];
          const hasSyncedWords = words.length > 0;

          return (
            <button
              type="button"
              key={`${line.time}-${index}`}
              ref={isActive ? activeLineRef : null}
              onClick={() => canSeek && seekTo(line.time)}
              disabled={!canSeek}
              className={[
                "group relative block w-full origin-left rounded-2xl text-left",
                "transition-[opacity,transform] duration-500 ease-out",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80",
                canSeek ? "cursor-pointer" : "cursor-default",
                "px-5 pb-4 pt-0 sm:px-7 sm:pb-5 sm:pt-0",
              ].join(" ")}
              style={{ opacity: getLineOpacity(index, activeLyricLineIndex) }}
              aria-current={isActive ? "true" : undefined}
              title={canSeek ? "Phát từ câu này" : undefined}
            >
              {isActive ? (
                <span
                  className="absolute bottom-5 left-0 top-5 w-1 rounded-full shadow-[0_0_18px_currentColor]"
                  style={{ backgroundColor: theme.accentText, color: theme.accentText }}
                />
              ) : null}

              <span
                className={[
                  "block font-bold tracking-[-0.025em]",
                  "transition-[font-size,line-height,color] duration-300",
                  isActive
                    ? isFullscreen
                      ? "text-[clamp(1.65rem,3.2vw,3.35rem)] leading-[1.12]"
                      : "text-[clamp(1.4rem,2.5vw,2.5rem)] leading-[1.18]"
                    : isFullscreen
                      ? "text-[clamp(1.3rem,2.35vw,2.45rem)] leading-[1.2]"
                      : "text-[clamp(1.1rem,1.8vw,1.8rem)] leading-[1.3]",
                ].join(" ")}
                style={{
                  color: isActive ? theme.primaryText : theme.secondaryText,
                  textShadow: isActive ? "0 8px 26px rgba(0,0,0,0.18)" : "none",
                }}
              >
                {hasSyncedWords
                  ? words.map((word, wordIndex) => {
                    const isCurrentWord = isActive && wordIndex === activeLyricWordIndex;
                    const isCompletedWord = isActive
                      && activeLyricWordIndex >= 0
                      && wordIndex < activeLyricWordIndex;

                    return (
                      <span
                        key={`${line.time}-${word.time}-${wordIndex}`}
                        className={[
                          "inline transition-[color,opacity,text-shadow] duration-200",
                          isActive && !isCurrentWord && !isCompletedWord
                            ? "opacity-55"
                            : "opacity-100",
                        ].join(" ")}
                        style={{
                          color: isActive
                            ? isCurrentWord
                              ? theme.accentText
                              : theme.primaryText
                            : "inherit",
                          textShadow: isCurrentWord
                            ? `0 0 22px ${theme.accentText}`
                            : undefined,
                        }}
                      >
                        {word.text}{" "}
                      </span>
                    );
                  })
                  : line.text}
              </span>

              {canSeek ? (
                <span
                  className="absolute right-6 top-3 hidden text-[10px] font-semibold uppercase tracking-[0.16em] opacity-0 transition-opacity group-hover:opacity-70 sm:block"
                  style={{ color: theme.supportText }}
                >
                  Nhấn để phát từ đây
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SyncedLyrics;
