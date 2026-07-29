import { Play } from "lucide-react";
import { Link } from "react-router-dom";

const cardClassName = `
  group relative flex h-full cursor-pointer flex-col gap-1.5 rounded-[12px]
  p-1 text-left transition duration-300 sm:mt-2 sm:gap-3 sm:rounded-[9px] sm:p-2
  hover:-translate-y-1 hover:bg-[#f4f4f4] hover:shadow-[0_18px_40px_rgba(15,23,42,0.12)]
  dark:border-white/10 dark:hover:bg-[#222222]
`;

const ContentCard = ({
  image,
  title,
  subtitle,
  href,
  onPlay,
  type,
  playButtonAriaLabel = true,
}) => {
  const handlePlayClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onPlay?.();
  };

  const cardContent = (
    <>
      <div className="relative overflow-hidden rounded-[9px] bg-[#ececec] dark:bg-[#282828] sm:rounded-[8px]">
        <div className="aspect-square overflow-hidden">
          { image ? (
            <img
              src={ image }
              alt={ title }
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]"
            />
          ) : (
            <div
              className="
                flex h-full w-full items-center justify-center bg-gradient-to-br
                from-[#d4d4d4] via-[#e5e5e5] to-[#f5f5f5] text-2xl font-semibold text-[#3f3f46]
                dark:from-[#242424] dark:via-[#1f1f1f] dark:to-[#121212] dark:text-white/80
                sm:text-3xl
              "
            >
              { title?.charAt(0)?.toUpperCase() ?? "M" }
            </div>
          ) }
        </div>

        { playButtonAriaLabel && (
          <button
            type="button"
            onClick={ handlePlayClick }
            aria-label={ `Play ${type} ${title}` }
            className="
            absolute bottom-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full
            bg-gradient-to-br from-[#E0FFE0] via-[#D3FFCE] to-[#FFD700] text-black opacity-100 shadow-[0_14px_28px_rgba(30,215,96,0.38)]
            transition duration-300 md:translate-y-3 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100
            group-hover:shadow-[0_18px_34px_rgba(30,215,96,0.45)] focus-visible:translate-y-0
            focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-[#1ed760] focus-visible:ring-offset-2 focus-visible:ring-offset-white
            hover:scale-[1.03] dark:ring-offset-[#181818] sm:bottom-2.5 sm:right-2.5 sm:h-11 sm:w-11
          "
          >
            <Play className="h-4 w-4 fill-current sm:h-5 sm:w-5" />
          </button>
        ) }
      </div>

      <div className="flex min-h-[3.25rem] flex-col justify-center sm:min-h-[3.5rem]">
        <h3 className="truncate text-[13px] font-semibold text-[#18181b] dark:text-white sm:text-base">
          { title }
        </h3>
        <p className="mt-0.5 truncate text-[11px] text-[#52525b] dark:text-[#a1a1aa] sm:mt-1 sm:text-sm">
          { subtitle }
        </p>
      </div>
    </>
  );

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

export default ContentCard;
