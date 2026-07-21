import { useMemo } from "react";
import { Music2, X } from "lucide-react";

const MANUAL_QUEUE_SOURCE = "manual";

const resolveContextQueueTitle = (activeCollection = null) => {
  if (!activeCollection?.title) {
    return "Nội dung tiếp theo";
  }

  if (activeCollection.type === "album") {
    return `Nội dung tiếp theo từ ${activeCollection.title}`;
  }

  if (activeCollection.type === "playlist") {
    return `Nội dung tiếp theo từ ${activeCollection.title}`;
  }

  return `Nội dung tiếp theo từ ${activeCollection.title}`;
};

const buildQueueSections = (
  queue = [],
  currentIndex = -1,
  activeCollection = null
) => {
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
          title: "Tiếp theo trong danh sách chờ",
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
        title: "Tiếp theo trong danh sách chờ",
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
  activeCollection = null,
  onPlayTrack,
  onRemoveTrack,
  onClearQueue,
  onClose,
  removingTrackIndex = -1,
  className = "",
  variant = "popup",
}) => {
  const isSidebarVariant = variant === "sidebar";

  const queueSections = useMemo(
    () => buildQueueSections(queue, currentIndex, activeCollection),
    [queue, currentIndex, activeCollection]
  );

  const renderQueueTrack = ({ track, index }) => {
    const isCurrentTrack = index === currentIndex;
    const isRemovingTrack = removingTrackIndex === index;

    const isExplicit =
      track?.raw?.explicit === true || track?.raw?.isExplicit === true;

    const trackKey = `${track?.queueItemId ||
      track?.id ||
      track?.playbackTrackId ||
      "queue-track"
      }-${index}`;

    return (
      <div
        key={ trackKey }
        className={ [
          "group relative min-w-0 rounded-lg",
          "transition-opacity duration-200",
          isRemovingTrack ? "pointer-events-none opacity-40" : "",
        ].join(" ") }
      >
        <button
          type="button"
          onClick={ () => onPlayTrack?.(index) }
          className={ [
            "relative flex w-full min-w-0 items-center gap-3",
            "rounded-lg border border-transparent",
            "px-2.5 py-2 pr-11 text-left",
            "transition-all duration-150",
            isCurrentTrack
              ? [
                "border-y-white/[0.08] border-l-white/[0.08]",
                "border-r-[3px] border-r-white",
                "bg-white/[0.08]",
                "shadow-[0_4px_18px_rgba(0,0,0,0.2)]",
              ].join(" ")
              : [
                "hover:border-white/[0.06]",
                "hover:bg-white/[0.05]",
              ].join(" "),
          ].join(" ") }
          aria-label={ `Phát ${track?.title || "bài hát"
            } từ danh sách chờ` }
        >
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-[#242424]">
            { track?.image ? (
              <img
                src={ track.image }
                alt={ track.title || "Track cover" }
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[#8b8b8b]">
                <Music2 className="h-5 w-5" />
              </div>
            ) }

            { isCurrentTrack ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                <div className="flex h-5 items-end gap-[2px]">
                  <span className="h-2 w-[2px] animate-pulse rounded-full bg-white" />

                  <span className="h-4 w-[2px] animate-pulse rounded-full bg-white [animation-delay:150ms]" />

                  <span className="h-3 w-[2px] animate-pulse rounded-full bg-white [animation-delay:300ms]" />
                </div>
              </div>
            ) : null }
          </div>

          <div className="min-w-0 flex-1">
            <p
              className={ [
                "truncate text-[14px] font-semibold leading-5",
                "tracking-[-0.01em]",
                isCurrentTrack ? "text-white" : "text-[#eeeeee]",
              ].join(" ") }
            >
              { track?.title || "Bài hát chưa có tên" }
            </p>

            <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
              { isExplicit ? (
                <span className="inline-flex h-[14px] min-w-[14px] shrink-0 items-center justify-center rounded-[3px] bg-[#b3b3b3] px-[3px] text-[9px] font-black leading-none text-[#111111]">
                  E
                </span>
              ) : null }

              <p className="truncate text-[12px] leading-4 text-[#a7a7a7]">
                { track?.artistName || "Nghệ sĩ không xác định" }
              </p>
            </div>
          </div>
        </button>

        { onRemoveTrack ? (
          <button
            type="button"
            onClick={ (event) => {
              event.stopPropagation();
              onRemoveTrack?.(index);
            } }
            disabled={ isRemovingTrack }
            className={ [
              "absolute right-3 top-1/2 z-10",
              "flex h-7 w-7 -translate-y-1/2 items-center justify-center",
              "rounded-md text-[#a7a7a7] opacity-0",
              "transition-all duration-150",
              "hover:bg-white/10 hover:text-white",
              "focus-visible:opacity-100",
              "disabled:cursor-not-allowed disabled:opacity-30",
              "group-hover:opacity-100 group-focus-within:opacity-100",
            ].join(" ") }
            aria-label={ `Xóa ${track?.title || "bài hát"
              } khỏi danh sách chờ` }
            title="Xóa khỏi danh sách chờ"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null }
      </div>
    );
  };

  return (
    <div
      className={ [
        "w-full overflow-hidden bg-[#121212] text-white",
        isSidebarVariant
          ? [
            "flex h-full min-h-0 flex-col",
            "border-l border-white/[0.06]",
          ].join(" ")
          : [
            "max-w-[380px] rounded-xl",
            "border border-white/[0.08]",
            "shadow-[0_24px_70px_rgba(0,0,0,0.6)]",
          ].join(" "),
        className,
      ].join(" ") }
    >
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/[0.07] px-4">
        <div className="min-w-0">
          <h2 className="truncate text-[16px] font-bold leading-5 tracking-[-0.015em] text-white">
            Danh sách chờ
          </h2>

          { queue.length > 0 ? (
            <p className="mt-0.5 text-[11px] leading-4 text-[#8f8f8f]">
              { queue.length } bài hát
            </p>
          ) : null }
        </div>

        { onClose ? (
          <button
            type="button"
            onClick={ onClose }
            className={ [
              "inline-flex h-8 w-8 shrink-0 items-center justify-center",
              "rounded-lg text-[#a7a7a7]",
              "transition-colors duration-150",
              "hover:bg-white/[0.08] hover:text-white",
            ].join(" ") }
            aria-label="Đóng danh sách chờ"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        ) : null }
      </header>

      { queue.length === 0 ? (
        <div
          className={ [
            "flex flex-1 items-center justify-center px-6 py-12",
            isSidebarVariant ? "min-h-0" : "",
          ].join(" ") }
        >
          <div className="max-w-[240px] text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-[#a7a7a7]">
              <Music2 className="h-6 w-6" />
            </div>

            <p className="mt-4 text-[15px] font-semibold text-white">
              Danh sách chờ đang trống
            </p>

            <p className="mt-1.5 text-[12px] leading-5 text-[#8f8f8f]">
              Chọn một bài hát hoặc thêm bài hát vào danh sách chờ để bắt đầu.
            </p>
          </div>
        </div>
      ) : (
        <div
          className={ [
            "overflow-y-auto overscroll-contain",
            "[&::-webkit-scrollbar]:w-1.5",
            "[&::-webkit-scrollbar-track]:bg-transparent",
            "[&::-webkit-scrollbar-thumb]:rounded-full",
            "[&::-webkit-scrollbar-thumb]:bg-[#555555]",
            "[&::-webkit-scrollbar-thumb:hover]:bg-[#6a6a6a]",
            isSidebarVariant ? "min-h-0 flex-1" : "max-h-[32rem]",
          ].join(" ") }
        >
          <div className="divide-y divide-white/[0.055]">
            { queueSections.map((section) => (
              <section
                key={ section.id }
                className={ [
                  "min-w-0 px-2.5 py-4",
                  section.id === "played" ? "opacity-70" : "",
                ].join(" ") }
              >
                <div className="mb-2 flex min-w-0 items-center justify-between gap-4 px-2">
                  <h3 className="min-w-0 truncate text-[13px] font-bold leading-5 tracking-[-0.01em] text-[#d9d9d9]">
                    { section.title }
                  </h3>

                  { section.id === "manual-upcoming" && onClearQueue ? (
                    <button
                      type="button"
                      onClick={ () => onClearQueue?.() }
                      className={ [
                        "shrink-0 rounded-md px-2 py-1",
                        "text-[11px] font-semibold leading-4",
                        "text-[#9f9f9f]",
                        "transition-colors duration-150",
                        "hover:bg-white/[0.08] hover:text-white",
                      ].join(" ") }
                    >
                      Xóa danh sách
                    </button>
                  ) : null }
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