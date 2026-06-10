import { useState } from "react";
import { Music2, Pause, Play, Volume2, X } from "lucide-react";

const PlayerQueueMenu = ({
  queue = [],
  currentIndex = -1,
  isPlaying = false,
  onPlayTrack,
  onRemoveTrack,
  onClose,
  removingTrackIndex = -1,
  className = "",
}) => {
  const [hoveredIndicatorIndex, setHoveredIndicatorIndex] = useState(-1);

  return (
    <div
      className={ [
        "w-full rounded-lg border border-white/10 bg-[#121212] px-2.5 py-2 text-white shadow-[0_16px_40px_rgba(0,0,0,0.34)]",
        className,
      ].join(" ") }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">Noi dung tiep theo</p>
          <p className="mt-0.5 text-[11px] leading-4 text-white/55">
            { currentIndex >= 0 && queue.length > 0
              ? `${currentIndex + 1}/${queue.length}`
              : `${queue.length} bai hat` }
          </p>
        </div>

        { onClose ? (
          <button
            type="button"
            onClick={ onClose }
            className="inline-flex h-5 w-5 items-center justify-center rounded-[4px] text-white/60 transition hover:bg-white/8 hover:text-white"
            aria-label="Close queue"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        ) : null }
      </div>

      { queue.length === 0 ? (
        <div className="mt-2.5 rounded-md bg-white/[0.04] px-4 py-5 text-center">
          <Music2 className="mx-auto h-4 w-4 text-white/45" />
          <p className="mt-2 text-sm font-medium text-white">Queue dang trong</p>
          <p className="mt-1 text-xs text-white/50">
            Chon bai hat de bat dau phat va them vao hang cho.
          </p>
        </div>
      ) : (
        <div className="mt-2.5 max-h-72 space-y-0.5 overflow-y-auto pr-1">
          { queue.map((track, index) => {
            const isCurrentTrack = index === currentIndex;
            const isRemovingTrack = removingTrackIndex === index;
            const isExplicit =
              track?.raw?.explicit === true || track?.raw?.isExplicit === true;
            const showWaveState = isCurrentTrack && isPlaying;

            return (
              <div
                key={ `${track?.id || track?.playbackTrackId || "queue-track"}-${index}` }
                className={ [
                  "group flex items-center gap-2 rounded-[6px] px-1.5 py-1.5 transition",
                  isCurrentTrack
                    ? "bg-white/[0.08]"
                    : "hover:bg-white/[0.05]",
                ].join(" ") }
              >
                <button
                  type="button"
                  onClick={ () => onPlayTrack?.(index) }
                  onMouseEnter={ () => setHoveredIndicatorIndex(index) }
                  onMouseLeave={ () => setHoveredIndicatorIndex(-1) }
                  onFocus={ () => setHoveredIndicatorIndex(index) }
                  onBlur={ () => setHoveredIndicatorIndex(-1) }
                  className={ [
                    "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition",
                    isCurrentTrack
                      ? "bg-white text-black"
                      : "text-white/65 hover:bg-white/10 hover:text-white",
                  ].join(" ") }
                  aria-label={
                    isCurrentTrack && isPlaying
                      ? `Pause ${track?.title || "track"}`
                      : `Play ${track?.title || "track"}`
                  }
                  title={ isCurrentTrack && isPlaying ? "Pause" : "Play from queue" }
                >
                  { showWaveState && hoveredIndicatorIndex !== index ? (
                    <>
                      <span className="flex items-end gap-[2px]">
                        <span
                          className="h-2 w-[2px] animate-pulse rounded-full bg-black"
                          style={ { animationDuration: "0.9s", animationDelay: "0ms" } }
                        />
                        <span
                          className="h-3 w-[2px] animate-pulse rounded-full bg-black"
                          style={ { animationDuration: "0.7s", animationDelay: "120ms" } }
                        />
                        <span
                          className="h-2.5 w-[2px] animate-pulse rounded-full bg-black"
                          style={ { animationDuration: "0.85s", animationDelay: "240ms" } }
                        />
                      </span>
                    </>
                  ) : showWaveState ? (
                    <Pause className="h-3 w-3 fill-current" />
                  ) : isCurrentTrack ? (
                    <Volume2 className="h-3 w-3" />
                  ) : (
                    <Play className="h-3 w-3 fill-current" />
                  ) }
                </button>

                { track?.image ? (
                  <img
                    src={ track.image }
                    alt={ track.title }
                    className="h-10 w-10 shrink-0 rounded-[4px] object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px] bg-white/8 text-[10px] font-semibold text-white/80">
                    { track?.title?.charAt(0)?.toUpperCase() || "M" }
                  </div>
                ) }

                <div className="min-w-0 flex-1">
                  <p
                    className={ [
                      "truncate text-[13px] font-medium leading-4",
                      isCurrentTrack ? "text-white" : "text-white/92",
                    ].join(" ") }
                  >
                    { track?.title || "Untitled track" }
                  </p>
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-white/58">
                    { isExplicit ? (
                      <span className="inline-flex h-3.5 shrink-0 items-center rounded-[3px] bg-white/75 px-1 text-[9px] font-semibold text-black">
                        E
                      </span>
                    ) : null }
                    <p className="truncate">
                      { track?.artistName || "Unknown artist" }
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={ () => onRemoveTrack?.(index) }
                  disabled={ isRemovingTrack }
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] text-white/40 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={ `Remove ${track?.title || "track"} from queue` }
                  title="Remove from queue"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          }) }
        </div>
      ) }
    </div>
  );
};

export default PlayerQueueMenu;
