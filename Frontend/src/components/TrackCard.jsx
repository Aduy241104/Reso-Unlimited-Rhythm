import { CheckCircle2, Play } from "lucide-react";
import { Link } from "react-router-dom";

const TrackCard = ({
  index,
  image,
  title,
  artist,
  artistId,
  duration,
  explicit = false,
  liked = false,
  onPlay,
  onLike,
  href,
}) => {
  const isMobileViewport =
    typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches;

  const handlePlay = (event) => {
    event.stopPropagation();
    onPlay?.();
  };

  const handleLike = (event) => {
    event.stopPropagation();
    onLike?.();
  };

  const handleCardClick = () => {
    if (isMobileViewport) {
      onPlay?.();
    }
  };

  const handleMobileLinkClick = (event) => {
    if (!isMobileViewport) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onPlay?.();
  };

  return (
    <article
      onClick={ handleCardClick }
      className="
        group grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-[8px]
        cursor-pointer px-0 py-2 transition hover:bg-black/[0.05] sm:px-3 sm:py-2.5
        dark:hover:bg-white/[0.06] sm:grid-cols-[2.5rem_minmax(0,1fr)_2.75rem_3.25rem]
      "
    >
      <div className="flex items-center justify-center text-sm text-[#71717a] dark:text-[#a1a1aa]">
        <span className="group-hover:hidden">{ index }</span>
        <button
          type="button"
          onClick={ handlePlay }
          aria-label={ `Play ${title}` }
          className="
            hidden h-8 w-8 items-center justify-center rounded-full text-[#111111]
            sm:group-hover:inline-flex dark:text-white
          "
        >
          <Play className="h-4 w-4 fill-current" />
        </button>
      </div>

      <div className="flex min-w-0 items-center gap-3">
        { image ? (
          <img
            src={ image }
            alt={ title }
            className="h-11 w-11 rounded-[10px] object-cover shadow-[0_8px_24px_rgba(15,23,42,0.14)]"
          />
        ) : (
          <div
            className="
              flex h-11 w-11 items-center justify-center rounded-[10px] bg-[#ececec] text-[11px]
              font-semibold uppercase tracking-[0.08em] text-[#52525b]
              dark:bg-[#282828] dark:text-[#a1a1aa]
            "
          >
            N/A
          </div>
        ) }

        <div className="min-w-0">
          { href ? (
            <Link to={ href } onClick={ handleMobileLinkClick } className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-medium text-[#111111] dark:text-white sm:text-[15px] hover:underline">
                { title }
              </p>
            </Link>
          ) : (
            null
          ) }
          <p className="truncate text-sm font-medium text-[#111111] dark:text-white sm:hidden">
            { title }
          </p>
          { !href ? (
            <p className="hidden truncate text-sm font-medium text-[#111111] dark:text-white sm:block sm:text-[15px]">
              { title }
            </p>
          ) : null }
          <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-[#71717a] dark:text-[#a1a1aa] sm:text-sm">
            { explicit ? (
              <span
                className="
                  inline-flex h-4 shrink-0 items-center rounded-[4px] bg-black/10 px-1.5
                  text-[10px] font-semibold uppercase text-[#3f3f46]
                  dark:bg-white/12 dark:text-[#e4e4e7]
                "
              >
                E
              </span>
            ) : null }
            { artistId ? (
              <Link
                to={ `/artists/${artistId}` }
                onClick={ handleMobileLinkClick }
                className="hidden truncate hover:underline sm:inline"
              >
                { artist }
              </Link>
            ) : (
              null
            ) }
            <span className="truncate sm:hidden">{ artist }</span>
            { !artistId ? (
              <span className="hidden truncate sm:inline">{ artist }</span>
            ) : null }
            { duration ? (
              <span className="shrink-0 text-[11px] sm:hidden">
                { duration }
              </span>
            ) : null }
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end sm:justify-center">
        { liked ? (
          <button
            type="button"
            onClick={ handleLike }
            aria-label={ `Unlike ${title}` }
            className="hidden h-8 w-8 items-center justify-center text-[#1ed760] sm:inline-flex"
          >
            <CheckCircle2 className="h-4.5 w-4.5 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={ handleLike }
            aria-label={ `Like ${title}` }
            className="
              hidden h-8 w-8 items-center justify-center text-[#71717a]
              transition sm:inline-flex sm:opacity-0 sm:group-hover:opacity-100 dark:text-[#a1a1aa]
            "
          >
            <CheckCircle2 className="h-4.5 w-4.5" />
          </button>
        ) }
      </div>

      <div className="hidden text-right text-sm text-[#52525b] dark:text-[#a1a1aa] sm:block">
        { duration }
      </div>
    </article>
  );
};

export default TrackCard;
