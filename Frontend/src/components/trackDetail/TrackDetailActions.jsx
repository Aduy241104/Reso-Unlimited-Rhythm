import { CirclePlus, Download, MoreHorizontal, Play } from "lucide-react";

const secondaryActionClassName = `
  inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-black/8 bg-white/80 px-4
  text-sm font-medium text-[#18181b] transition hover:bg-white sm:w-auto
  dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12]
`;

const iconActionClassName = `
  inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/8
  bg-white/80 text-[#18181b] transition hover:bg-white
  dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12]
`;

const TrackDetailActions = ({
  onPlay,
  onAddToLibrary,
  onDownload,
  onMore,
}) => (
  <section className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
    <button
      type="button"
      onClick={ onPlay }
      aria-label="Play track"
      className="
        inline-flex h-14 w-14 items-center justify-center self-start rounded-full bg-gradient-to-br from-[#ff8a3d] via-[#ff4fd8] to-[#7b61ff]
        text-black shadow-[0_18px_38px_rgba(30,215,96,0.28)] transition
        hover:scale-[1.03] hover:brightness-105
      "
    >
      <Play className="h-6 w-6 fill-current" />
    </button>

    <button type="button" onClick={ onAddToLibrary } className={ secondaryActionClassName }>
      <CirclePlus className="h-4.5 w-4.5" />
      Add to Library
    </button>

    <button type="button" onClick={ onDownload } className={ secondaryActionClassName }>
      <Download className="h-4.5 w-4.5" />
      Download
    </button>

    <button type="button" onClick={ onMore } aria-label="More options" className={ iconActionClassName }>
      <MoreHorizontal className="h-5 w-5" />
    </button>
  </section>
);

export default TrackDetailActions;
