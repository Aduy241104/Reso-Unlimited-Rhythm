import { Play } from "lucide-react";
import { Link } from "react-router-dom";

const cardClassName = `
  group relative mt-2 flex h-full cursor-pointer flex-col gap-2 rounded-[16px]
  p-2.5 text-left transition duration-300 sm:gap-3 sm:p-3
  hover:-translate-y-1 hover:bg-[#f4f4f4] hover:shadow-[0_18px_40px_rgba(15,23,42,0.12)]
  dark:border-white/10 dark:hover:bg-[#242424]
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
      <div className="relative overflow-hidden rounded-[14px] bg-[#ececec] dark:bg-[#282828]">
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
                from-[#d4d4d4] via-[#e5e5e5] to-[#f5f5f5] text-3xl font-semibold text-[#3f3f46]
                dark:from-[#242424] dark:via-[#1f1f1f] dark:to-[#121212] dark:text-white/80
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
            absolute bottom-2.5 right-2.5 inline-flex h-10 w-10 items-center justify-center rounded-full
            bg-gradient-to-br from-[#E0FFE0] via-[#D3FFCE] to-[#FFD700] text-black opacity-100 shadow-[0_14px_28px_rgba(30,215,96,0.38)]
            transition duration-300 md:translate-y-3 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100
            group-hover:shadow-[0_18px_34px_rgba(30,215,96,0.45)] focus-visible:translate-y-0
            focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-[#1ed760] focus-visible:ring-offset-2 focus-visible:ring-offset-white
            hover:scale-[1.03] dark:ring-offset-[#181818] sm:h-11 sm:w-11
          "
          >
            <Play className="h-5 w-5 fill-current" />
          </button>
        ) }
      </div>

      <div className="flex min-h-[3.75rem] flex-col justify-center">
        <h3 className="truncate text-sm font-semibold text-[#18181b] dark:text-white sm:text-base">
          { title }
        </h3>
        <p className="mt-1 truncate text-sm text-[#52525b] dark:text-[#a1a1aa]">
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
