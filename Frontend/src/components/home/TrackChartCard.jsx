import { Link } from "react-router-dom";

const TrackChartCard = ({
  image,
  title,
  subtitle,
  href,
  onPlay,
  type,
  showPlayButton = true,
}) => {
  const handlePlayClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onPlay?.();
  };

  const cardContent = (
    <>
      <div className="relative overflow-hidden rounded-[20px] bg-[#ececec] dark:bg-[#1f1f1f]">
        <div className="aspect-[16/10] overflow-hidden">
          { image ? (
            <img
              src={ image }
              alt={ title }
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div
              className="
                flex h-full w-full items-center justify-center bg-gradient-to-br
                from-[#d4d4d4] via-[#e5e5e5] to-[#f5f5f5] text-3xl font-semibold text-[#3f3f46]
                dark:from-[#242424] dark:via-[#1f1f1f] dark:to-[#121212] dark:text-white/80
              "
            >
              { title?.charAt(0)?.toUpperCase() ?? "T" }
            </div>
          ) }
        </div>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/12 to-transparent" />

        { showPlayButton ? (
          <button
            type="button"
            onClick={ handlePlayClick }
            aria-label={ `Play ${type} ${title}` }
            className="
              absolute bottom-3 right-3 inline-flex h-10 w-10 items-center justify-center rounded-full
              bg-[#f4f4f5] text-[#111111] shadow-[0_14px_30px_rgba(0,0,0,0.22)] transition
              hover:scale-[1.04] hover:bg-white focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-[#1ed760] focus-visible:ring-offset-2 focus-visible:ring-offset-white
              dark:bg-white dark:text-[#111111] dark:focus-visible:ring-offset-[#181818]
            "
          >
            <span className="sr-only">{ `Play ${type} ${title}` }</span>
            <span className="block h-0 w-0 border-b-[7px] border-l-[11px] border-t-[7px] border-b-transparent border-l-current border-t-transparent" />
          </button>
        ) : null }

        <div className="absolute left-3 top-3">
          <span
            className="
              inline-flex rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium uppercase
              tracking-[0.22em] text-white/88 backdrop-blur-sm
            "
          >
            { type }
          </span>
        </div>
      </div>

      <div className="space-y-1 px-1">
        <h3 className="truncate text-base font-semibold tracking-tight text-[#18181b] dark:text-white">
          { title }
        </h3>
        <p className="line-clamp-2 text-sm leading-5 text-[#52525b] dark:text-[#a1a1aa]">
          { subtitle }
        </p>
      </div>
    </>
  );

  const cardClassName = `
    group flex h-full flex-col gap-3 rounded-[22px] p-2 transition duration-300
    hover:-translate-y-1 hover:bg-black/[0.025] dark:hover:bg-white/[0.03]
  `;

  if (!href) {
    return <article className={ cardClassName }>{ cardContent }</article>;
  }

  if (href.startsWith("/")) {
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
