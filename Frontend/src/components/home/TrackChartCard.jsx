import {
  ArrowUpRight,
  AudioLines,
  CalendarDays,
  Mic2,
  Play,
} from "lucide-react";
import { Link } from "react-router-dom";

const variantStyles = {
  daily: {
    badge: "border-emerald-500/18 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  monthly: {
    badge: "border-sky-500/18 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  artist: {
    badge: "border-violet-500/18 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
};

const TrackChartCard = ({
  image,
  title,
  subtitle,
  href,
  onPlay,
  type,
  variant = "daily",
  showPlayButton = true,
}) => {
  const handlePlayClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onPlay?.();
  };

  const BadgeIcon =
    variant === "artist"
      ? Mic2
      : variant === "monthly"
        ? CalendarDays
        : AudioLines;
  const resolvedStyles = variantStyles[variant] || variantStyles.daily;
  const isExternalLink = href && !href.startsWith("/");
  const isArtist = variant === "artist";
  const cardClassName = [
    `
      group relative flex h-full min-h-0 cursor-pointer flex-col gap-1.5 overflow-hidden
      text-left transition duration-300
      hover:-translate-y-1 hover:bg-[#f4f4f4] hover:shadow-[0_18px_40px_rgba(15,23,42,0.12)]
      dark:border-white/10 dark:hover:bg-[#222222]
    `,
    isArtist
      ? "mt-1 rounded-[14px] p-2 sm:mt-2 sm:gap-3 sm:rounded-[16px] sm:p-3"
      : "rounded-[12px] p-1 sm:mt-2 sm:gap-3 sm:rounded-[9px] sm:p-2",
  ].join(" ");

  const cardContent = (
    <>
      <div
        className={ [
          "relative bg-[#ececec] dark:bg-[#282828]",
          isArtist
            ? "mx-auto aspect-square w-[76%] rounded-full sm:w-[78%]"
            : "overflow-hidden rounded-[9px] sm:rounded-[8px]",
        ].join(" ") }
      >
        <div
          className={
            isArtist
              ? "h-full w-full overflow-hidden rounded-full"
              : "aspect-square overflow-hidden"
          }
        >
          { image ? (
            <img
              src={ image }
              alt={ title }
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-[#d4d4d4] via-[#e5e5e5] to-[#f5f5f5] dark:from-[#242424] dark:via-[#1f1f1f] dark:to-[#121212]" />
          ) }
        </div>

        { isArtist ? (
          <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-t from-black/18 via-transparent to-black/5" />
        ) : null }

        <div className="absolute left-2.5 top-2.5 flex items-center gap-2">
          <span
            className={ [
              "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.14em] backdrop-blur-md sm:px-2 sm:py-1 sm:text-[9px] sm:tracking-[0.18em]",
              resolvedStyles.badge,
            ].join(" ") }
          >
            <BadgeIcon className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
            { type }
          </span>
        </div>

        { showPlayButton ? (
          <button
            type="button"
            onClick={ handlePlayClick }
            aria-label={ `Play ${type} ${title}` }
            className="
              absolute bottom-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full
              bg-gradient-to-br from-[#ff7a3d] via-[#ff4d2e] to-[#e53935] text-white opacity-100
              shadow-[0_14px_28px_rgba(239,68,68,0.38)] transition duration-300 md:translate-y-3
              md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100
              group-hover:shadow-[0_18px_34px_rgba(239,68,68,0.48)] hover:scale-[1.03]
              focus-visible:translate-y-0 focus-visible:opacity-100
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5a36]
              focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:ring-offset-[#181818]
              sm:bottom-2.5 sm:right-2.5 sm:h-11 sm:w-11
            "
          >
            <Play className="h-4 w-4 fill-current sm:h-5 sm:w-5" />
          </button>
        ) : null }
      </div>

      <div
        className={ [
          "flex flex-1 flex-col justify-center",
          isArtist ? "min-h-[3.2rem] sm:min-h-[3.8rem]" : "min-h-[3.25rem] sm:min-h-[3.5rem]",
        ].join(" ") }
      >
        <div className={ isArtist ? "flex items-start justify-between gap-2" : "min-w-0" }>
          <div className="min-w-0">
            <h3 className="truncate text-[13px] font-semibold text-[#18181b] dark:text-white sm:text-base">
              { title }
            </h3>
            <p className="mt-0.5 truncate text-[11px] text-[#52525b] dark:text-[#a1a1aa] sm:mt-1 sm:text-sm">
              { subtitle }
            </p>
          </div>
          { isArtist ? (
            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/[0.045] text-[#52525b] transition group-hover:translate-x-0.5 group-hover:text-[#18181b] dark:bg-white/[0.06] dark:text-white/58 dark:group-hover:text-white sm:h-6 sm:w-6">
              <ArrowUpRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </span>
          ) : null }
        </div>
      </div>
    </>
  );

  if (!href) {
    return <article className={ cardClassName }>{ cardContent }</article>;
  }

  if (!isExternalLink) {
    return (
      <Link to={ href } className={ cardClassName }>
        { cardContent }
      </Link>
    );
  }

  return (
    <a href={ href } target="_blank" rel="noreferrer" className={ cardClassName }>
      { cardContent }
    </a>
  );
};

export default TrackChartCard;
