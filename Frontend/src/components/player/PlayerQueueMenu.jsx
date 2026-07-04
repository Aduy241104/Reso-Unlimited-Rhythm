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

    return (
      <div
        key={ `${track?.queueItemId || track?.id || track?.playbackTrackId || "queue-track"}-${index}` }
        className={ [
          "group relative min-w-0",
          isRemovingTrack ? "pointer-events-none opacity-45" : "",
        ].join(" ") }
      >
        <button
          type="button"
          onClick={ () => onPlayTrack?.(index) }
          className={ [
            "flex w-full min-w-0 items-center gap-2.5 rounded-md px-1 py-1 pr-7 text-left",
            "transition-colors duration-150",
            isCurrentTrack ? "bg-white/[0.035]" : "hover:bg-white/[0.045]",
          ].join(" ") }
          aria-label={ `Phát ${track?.title || "bài hát"} từ danh sách chờ` }
        >
          { track?.image ? (
            <img
              src={ track.image }
              alt={ track.title || "Track cover" }
              className="h-11 w-11 shrink-0 rounded-[4px] object-cover"
            />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[4px] bg-[#242424] text-[#8b8b8b]">
              <Music2 className="h-4 w-4" />
            </div>
          ) }

          <div className="min-w-0 flex-1">
            <p
              className={ [
                "truncate text-[14px] font-semibold leading-[1.25] tracking-[-0.01em]",
                isCurrentTrack ? "text-white" : "text-[#eeeeee]",
              ].join(" ") }
            >
              { track?.title || "Bài hát chưa có tên" }
            </p>

            <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12px] leading-4 text-[#a7a7a7]">
              { isExplicit ? (
                <span className="inline-flex h-[14px] shrink-0 items-center rounded-[3px] bg-[#bdbdbd] px-[4px] text-[9px] font-black leading-none text-[#111]">
                  E
                </span>
              ) : null }

              <p className="truncate">
                { track?.artistName || "Nghệ sĩ không xác định" }
              </p>
            </div>
          </div>
        </button>

        { onRemoveTrack ? (
          <button
            type="button"
            onClick={ () => onRemoveTrack?.(index) }
            disabled={ isRemovingTrack }
            className={ [
              "absolute right-1 top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full",
              "text-[#b3b3b3] transition-all duration-150",
              "hover:bg-white/10 hover:text-white",
              "disabled:cursor-not-allowed disabled:opacity-40",
              "group-hover:flex group-focus-within:flex",
            ].join(" ") }
            aria-label={ `Xóa ${track?.title || "bài hát"} khỏi danh sách chờ` }
            title="Xóa khỏi danh sách chờ"
          >
            <X className="h-3.5 w-3.5" />
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
          ? "flex h-full min-h-0 flex-col"
          : "max-w-[340px] rounded-xl border border-white/[0.08] shadow-[0_18px_60px_rgba(0,0,0,0.55)]",
        className,
      ].join(" ") }
    >
      <div className="flex h-[48px] shrink-0 items-center justify-between gap-3 px-2">
        <h2 className="truncate text-[15px] font-bold leading-5 tracking-[-0.01em] text-white">
          Danh sách chờ
        </h2>

        { onClose ? (
          <button
            type="button"
            onClick={ onClose }
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#b3b3b3] transition-colors duration-150 hover:bg-white/10 hover:text-white"
            aria-label="Đóng danh sách chờ"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null }
      </div>

      { queue.length === 0 ? (
        <div
          className={ [
            "flex flex-1 items-center justify-center px-4 py-8",
            isSidebarVariant ? "min-h-0" : "",
          ].join(" ") }
        >
          <div className="text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-[#b3b3b3]">
              <Music2 className="h-4 w-4" />
            </div>

            <p className="mt-3 text-[14px] font-semibold text-white">
              Danh sách chờ đang trống
            </p>

            <p className="mx-auto mt-1 max-w-[220px] text-[12px] leading-5 text-[#a7a7a7]">
              Chọn một bài hát để bắt đầu phát.
            </p>
          </div>
        </div>
      ) : (
        <div
          className={ [
            "overflow-y-auto px-1 pb-4",
            "[&::-webkit-scrollbar]:w-2",
            "[&::-webkit-scrollbar-track]:bg-transparent",
            "[&::-webkit-scrollbar-thumb]:rounded-full",
            "[&::-webkit-scrollbar-thumb]:bg-[#6a6a6a]",
            isSidebarVariant ? "min-h-0 flex-1" : "max-h-[30rem]",
          ].join(" ") }
        >
          <div className="space-y-5">
            { queueSections.map((section) => (
              <section key={ section.id } className="min-w-0">
                <div className="mb-1.5 flex items-start justify-between gap-3 px-1">
                  <h3 className="max-w-[170px] text-[15px] font-bold leading-[1.3] tracking-[-0.01em] text-[#f1f1f1]">
                    { section.title }
                  </h3>

                  { section.id === "manual-upcoming" ? (
                    <button
                      type="button"
                      onClick={ () => onClearQueue?.() }
                      className="shrink-0 text-right text-[12px] font-bold leading-4 text-[#a7a7a7] transition-colors duration-150 hover:text-white"
                    >
                      Xóa danh
                      <br />
                      sách chờ
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