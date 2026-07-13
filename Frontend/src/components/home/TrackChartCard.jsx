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
    chip: "bg-emerald-500 text-white shadow-[0_10px_24px_rgba(16,185,129,0.28)]",
  },
  monthly: {
    badge: "border-sky-500/18 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    chip: "bg-sky-500 text-white shadow-[0_10px_24px_rgba(14,165,233,0.28)]",
  },
  artist: {
    badge: "border-violet-500/18 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    chip: "bg-violet-500 text-white shadow-[0_10px_24px_rgba(139,92,246,0.28)]",
  },
};

const cardClassName = `
  group relative mt-1 flex h-full cursor-pointer flex-col gap-1.5 rounded-[14px]
  p-2 text-left transition duration-300 sm:mt-2 sm:gap-3 sm:rounded-[16px] sm:p-3
  hover:-translate-y-1 hover:bg-[#f4f4f4] hover:shadow-[0_18px_40px_rgba(15,23,42,0.12)]
  dark:hover:bg-[#242424]
`;

const TrackChartCard = ({
  image,
  title,
  subtitle,
  href,
  onPlay,
  type,
  index,
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
  const formattedRank = String(index || 0).padStart(2, "0");
  const isExternalLink = href && !href.startsWith("/");

  const cardContent = (
    <>
      <div className="relative overflow-hidden rounded-[12px] bg-[#ececec] dark:bg-[#282828] sm:rounded-[14px]">
        <div className="aspect-[1.28/1] overflow-hidden sm:aspect-[1.42/1] lg:aspect-[1.58/1]">
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

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/24 via-transparent to-black/6" />

        <div className="absolute left-2.5 top-2.5 flex items-center gap-2">
          <span
            className={ [
              "inline-flex min-w-[1.9rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-[0.1em] sm:min-w-[2.1rem] sm:px-2 sm:py-1 sm:text-[10px] sm:tracking-[0.12em]",
              resolvedStyles.chip,
            ].join(" ") }
          >
            #{ formattedRank }
          </span>
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
              bg-gradient-to-br from-[#E0FFE0] via-[#D3FFCE] to-[#FFD700] text-black opacity-100
              shadow-[0_14px_28px_rgba(30,215,96,0.38)] transition duration-300 md:translate-y-3
              md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100
              hover:scale-[1.03] focus-visible:translate-y-0 focus-visible:opacity-100
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1ed760]
              focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:ring-offset-[#181818]
              sm:bottom-2.5 sm:right-2.5 sm:h-10 sm:w-10
            "
          >
            <Play className="h-4 w-4 fill-current sm:h-5 sm:w-5" />
          </button>
        ) : null }
      </div>

      <div className="flex min-h-[3.2rem] flex-col justify-center sm:min-h-[3.8rem]">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-[13px] font-semibold text-[#18181b] dark:text-white sm:text-[15px]">
              { title }
            </h3>
            <p className="mt-0.5 truncate text-[11px] text-[#52525b] dark:text-[#a1a1aa] sm:mt-1 sm:text-[12px]">
              { subtitle }
            </p>
          </div>
          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/[0.045] text-[#52525b] transition group-hover:translate-x-0.5 group-hover:text-[#18181b] dark:bg-white/[0.06] dark:text-white/58 dark:group-hover:text-white sm:h-6 sm:w-6">
            <ArrowUpRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </span>
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
