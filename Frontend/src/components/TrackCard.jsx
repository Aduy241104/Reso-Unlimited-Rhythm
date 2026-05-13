import { CheckCircle2, Play } from "lucide-react";
import { Link } from "react-router-dom";

const TrackCard = ({
  index,
  image,
  title,
  artist,
  duration,
  explicit = false,
  liked = false,
  onPlay,
  onLike,
  href
}) => {
  const handlePlay = (event) => {
    event.stopPropagation();
    onPlay?.();
  };

  const handleLike = (event) => {
    event.stopPropagation();
    onLike?.();
  };

  return (
    <article
      className="
        group grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-[8px]
        px-3 py-2.5 transition hover:bg-black/[0.05]
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
            group-hover:inline-flex dark:text-white
          "
        >
          <Play className="h-4 w-4 fill-current" />
        </button>
      </div>

      <div className="flex min-w-0 items-center gap-3">
        <img
          src={ image }
          alt={ title }
          className="h-11 w-11 rounded-[10px] object-cover shadow-[0_8px_24px_rgba(15,23,42,0.14)]"
        />

        <div className="min-w-0">
          <Link Link to={ href } className="min-w-0">
            <p className="truncate text-sm font-medium text-[#111111] dark:text-white sm:text-[15px] hover:underline">
              { title }
            </p>
          </Link>
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
            <span className="truncate">{ artist }</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end sm:justify-center">
        { liked ? (
          <button
            type="button"
            onClick={ handleLike }
            aria-label={ `Unlike ${title}` }
            className="inline-flex h-8 w-8 items-center justify-center text-[#1ed760]"
          >
            <CheckCircle2 className="h-4.5 w-4.5 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={ handleLike }
            aria-label={ `Like ${title}` }
            className="
              inline-flex h-8 w-8 items-center justify-center text-[#71717a] opacity-0
              transition group-hover:opacity-100 dark:text-[#a1a1aa]
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
