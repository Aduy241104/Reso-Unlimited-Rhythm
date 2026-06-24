import { useMemo, useState } from "react";
import { Music2, Pause, Play, Volume2, X } from "lucide-react";

const MANUAL_QUEUE_SOURCE = "manual";

const resolveContextQueueTitle = (activeCollection = null) => {
  if (!activeCollection?.title) {
    return "Tiếp theo từ danh sách đang phát";
  }

  if (activeCollection.type === "album") {
    return `Tiếp theo từ album: ${activeCollection.title}`;
  }

  if (activeCollection.type === "playlist") {
    return `Tiếp theo từ playlist: ${activeCollection.title}`;
  }

  return `Tiếp theo từ: ${activeCollection.title}`;
};

const buildQueueSections = (queue = [], currentIndex = -1, activeCollection = null) => {
  const indexedQueue = queue.map((track, index) => ({
    track,
    index,
  }));

  if (indexedQueue.length === 0) {
    return [];
  }

  if (currentIndex < 0 || currentIndex >= indexedQueue.length) {
    const manualQueue = indexedQueue.filter(
      ({ track }) => track?.queueSource === MANUAL_QUEUE_SOURCE
    );
    const contextQueue = indexedQueue.filter(
      ({ track }) => track?.queueSource !== MANUAL_QUEUE_SOURCE
    );

    return [
      manualQueue.length > 0
        ? {
          id: "manual-upcoming",
          title: "Đã thêm vào danh sách chờ",
          items: manualQueue,
        }
        : null,
      contextQueue.length > 0
        ? {
          id: "context-upcoming",
          title: resolveContextQueueTitle(activeCollection),
          items: contextQueue,
        }
        : null,
    ].filter(Boolean);
  }

  const playedQueue = indexedQueue.slice(0, currentIndex);
  const currentQueue = indexedQueue.slice(currentIndex, currentIndex + 1);
  const upcomingQueue = indexedQueue.slice(currentIndex + 1);
  const manualQueue = upcomingQueue.filter(
    ({ track }) => track?.queueSource === MANUAL_QUEUE_SOURCE
  );
  const contextQueue = upcomingQueue.filter(
    ({ track }) => track?.queueSource !== MANUAL_QUEUE_SOURCE
  );

  return [
    currentQueue.length > 0
      ? {
        id: "current",
        title: "Đang phát",
        items: currentQueue,
      }
      : null,
    manualQueue.length > 0
      ? {
        id: "manual-upcoming",
        title: "Đã thêm vào danh sách chờ",
        items: manualQueue,
      }
      : null,
    contextQueue.length > 0
      ? {
        id: "context-upcoming",
        title: resolveContextQueueTitle(activeCollection),
        items: contextQueue,
      }
      : null,
    playedQueue.length > 0
      ? {
        id: "played",
        title: "Đã phát",
        items: playedQueue,
      }
      : null,
  ].filter(Boolean);
};

const PlayerQueueMenu = ({
  queue = [],
  currentIndex = -1,
  isPlaying = false,
  activeCollection = null,
  onPlayTrack,
  onRemoveTrack,
  onClose,
  removingTrackIndex = -1,
  className = "",
}) => {
  const [hoveredIndicatorIndex, setHoveredIndicatorIndex] = useState(-1);
  const queueSections = useMemo(
    () => buildQueueSections(queue, currentIndex, activeCollection),
    [queue, currentIndex, activeCollection]
  );

  const renderQueueTrack = ({ track, index }) => {
    const isCurrentTrack = index === currentIndex;
    const isRemovingTrack = removingTrackIndex === index;
    const isExplicit =
      track?.raw?.explicit === true || track?.raw?.isExplicit === true;
    const showWaveState = isCurrentTrack && isPlaying;

    return (
      <div
        key={ `${track?.queueItemId || track?.id || track?.playbackTrackId || "queue-track"}-${index}` }
        className={ [
          "group relative flex items-center gap-3 rounded-lg border px-2 py-2 transition-all duration-150",
          isCurrentTrack
            ? "border-white/[0.12] bg-white/[0.08] shadow-[inset_3px_0_0_rgba(255,255,255,0.9)]"
            : "border-transparent hover:border-white/[0.07] hover:bg-white/[0.055]",
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
            "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-150",
            isCurrentTrack
              ? "bg-white text-black shadow-sm"
              : "bg-white/[0.06] text-white/65 hover:bg-white hover:text-black",
          ].join(" ") }
          aria-label={
            isCurrentTrack && isPlaying
              ? `Tạm dừng ${track?.title || "bài hát"}`
              : `Phát ${track?.title || "bài hát"}`
          }
          title={ isCurrentTrack && isPlaying ? "Tạm dừng" : "Phát từ hàng chờ" }
        >
          { showWaveState && hoveredIndicatorIndex !== index ? (
            <span className="flex items-end gap-[2px] text-black">
              <span
                className="h-2 w-[2px] animate-pulse rounded-full bg-current"
                style={ { animationDuration: "0.9s", animationDelay: "0ms" } }
              />
              <span
                className="h-3 w-[2px] animate-pulse rounded-full bg-current"
                style={ { animationDuration: "0.7s", animationDelay: "120ms" } }
              />
              <span
                className="h-2.5 w-[2px] animate-pulse rounded-full bg-current"
                style={ { animationDuration: "0.85s", animationDelay: "240ms" } }
              />
            </span>
          ) : showWaveState ? (
            <Pause className="h-3.5 w-3.5 fill-current" />
          ) : isCurrentTrack ? (
            <Volume2 className="h-3.5 w-3.5" />
          ) : (
            <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
          ) }
        </button>

        { track?.image ? (
          <img
            src={ track.image }
            alt={ track.title }
            className={ [
              "h-11 w-11 shrink-0 rounded-md object-cover ring-1 ring-white/[0.08]",
              isCurrentTrack ? "ring-white/20" : "",
            ].join(" ") }
          />
        ) : (
          <div
            className={ [
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-xs font-semibold ring-1 ring-white/[0.08]",
              isCurrentTrack
                ? "bg-white/[0.1] text-white ring-white/20"
                : "bg-white/[0.06] text-white/70",
            ].join(" ") }
          >
            { track?.title?.charAt(0)?.toUpperCase() || "M" }
          </div>
        ) }

        <div className="min-w-0 flex-1">
          <p
            className={ [
              "truncate text-[13px] font-medium leading-5",
              isCurrentTrack ? "text-white" : "text-white/90",
            ].join(" ") }
          >
            { track?.title || "Bài hát chưa có tên" }
          </p>

          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-white/50">
            { isExplicit ? (
              <span className="inline-flex h-3.5 shrink-0 items-center rounded-[3px] bg-white/75 px-1 text-[9px] font-bold leading-none text-black">
                E
              </span>
            ) : null }

            <p className="truncate">
              { track?.artistName || "Nghệ sĩ không xác định" }
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={ () => onRemoveTrack?.(index) }
          disabled={ isRemovingTrack }
          className={ [
            "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/35 transition-all duration-150",
            "hover:bg-white/[0.08] hover:text-white",
            "disabled:cursor-not-allowed disabled:opacity-40",
            "sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100",
          ].join(" ") }
          aria-label={ `Xóa ${track?.title || "bài hát"} khỏi hàng chờ` }
          title="Xóa khỏi hàng chờ"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  };

  return (
    <div
      className={ [
        "w-full overflow-hidden rounded-xl border border-white/[0.08] bg-[#181818] text-white shadow-[0_18px_60px_rgba(0,0,0,0.45)]",
        className,
      ].join(" ") }
    >
      <div className="border-b border-white/[0.08] bg-white/[0.025] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-5 text-white">
              Nội dung tiếp theo
            </p>

            <p className="mt-0.5 text-[11px] leading-4 text-white/50">
              { currentIndex >= 0 && queue.length > 0
                ? `${currentIndex + 1}/${queue.length}`
                : `${queue.length} bài hát` }
            </p>
          </div>

          { onClose ? (
            <button
              type="button"
              onClick={ onClose }
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white/55 transition-all duration-150 hover:bg-white/[0.08] hover:text-white"
              aria-label="Đóng hàng chờ"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null }
        </div>
      </div>

      { queue.length === 0 ? (
        <div className="px-4 py-4">
          <div className="rounded-lg border border-dashed border-white/[0.1] bg-white/[0.035] px-4 py-6 text-center">
            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-white/55">
              <Music2 className="h-4 w-4" />
            </div>

            <p className="mt-3 text-sm font-medium text-white">
              Hàng chờ đang trống
            </p>

            <p className="mx-auto mt-1 max-w-[240px] text-xs leading-5 text-white/48">
              Chọn bài hát để bắt đầu phát và thêm vào hàng chờ.
            </p>
          </div>
        </div>
      ) : (
        <div className="max-h-[22rem] overflow-y-auto px-2 py-2.5 pr-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-track]:bg-transparent">
          <div className="space-y-4">
            { queueSections.map((section) => (
              <section key={ section.id } className="space-y-1.5">
                <div className="flex items-center gap-2 px-2">
                  <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-white/38">
                    { section.title }
                  </p>
                  <div className="h-px flex-1 bg-white/[0.06]" />
                </div>

                <div className="space-y-1">
                  { section.items.map(renderQueueTrack) }
                </div>
              </section>
            )) }
          </div>
        </div>
      ) }
    </div>
  );
};

export default PlayerQueueMenu;