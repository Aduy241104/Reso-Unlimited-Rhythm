import { CheckCircle2, Pause, Play } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import TrackTwoLevelMenu from "./trackMenu/TrackTwoLevelMenu";

const sizeClassNames = {
  default: {
    container:
      "gap-3 px-0 py-2 sm:px-3 sm:py-2.5",
    image:
      "h-11 w-11 rounded-[10px] object-cover shadow-[0_8px_24px_rgba(15,23,42,0.14)]",
    fallback:
      `
        flex h-11 w-11 items-center justify-center rounded-[10px] bg-[#ececec] text-[11px]
        font-semibold uppercase tracking-[0.08em] text-[#52525b]
        dark:bg-[#282828] dark:text-[#a1a1aa]
      `,
    title:
      "truncate text-sm font-medium text-[#111111] dark:text-white sm:text-[15px]",
    meta:
      "mt-1 flex min-w-0 items-center gap-2 text-xs text-[#71717a] dark:text-[#a1a1aa] sm:text-sm",
    mobileDuration: "shrink-0 text-[11px] sm:hidden",
    desktopMeta: "hidden text-right text-sm text-[#52525b] dark:text-[#a1a1aa] sm:block",
    index: "group-hover:hidden",
  },
  compact: {
    container:
      "gap-2 px-0 py-2 sm:px-2 sm:py-2",
    image:
      "h-10 w-10 rounded-[10px] object-cover shadow-[0_10px_20px_rgba(15,23,42,0.16)]",
    fallback:
      `
        flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#ececec] text-[10px]
        font-semibold uppercase tracking-[0.08em] text-[#52525b]
        dark:bg-[#282828] dark:text-[#a1a1aa]
      `,
    title:
      "truncate text-[13px] font-medium text-[#111111] dark:text-white sm:text-sm",
    meta:
      "mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-[#71717a] dark:text-[#a1a1aa] sm:text-xs",
    mobileDuration: "shrink-0 text-xs sm:hidden",
    desktopMeta: "hidden text-right text-xs text-[#52525b] dark:text-[#a1a1aa] sm:block",
    index: "text-base sm:text-lg group-hover:hidden",
  },
};

const TrackCard = ({
  index,
  trackId,
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
  size = "default",
  className = "",
  mobileLayoutClassName = "grid-cols-[2rem_minmax(0,1fr)_auto]",
  desktopLayoutClassName = "sm:grid-cols-[2.5rem_minmax(0,1fr)_2.75rem_3.25rem_2.75rem]",
  desktopMetaColumns = [],
  mobileMetaItems = [],
  showLikeButton = true,
  onPlaybackAction,
  isPlaybackActive = false,
  isPlaying = false,
  indexClassName = "",
}) => {
  const isMobileViewport =
    typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches;
  const resolvedSize = sizeClassNames[size] ? size : "default";
  const resolvedClasses = sizeClassNames[resolvedSize];
    const navigate = useNavigate();
  const resolvedDesktopMetaColumns = desktopMetaColumns.filter(Boolean);
  const resolvedMobileMetaItems = mobileMetaItems.filter(Boolean);
  const primaryAction = onPlaybackAction || onPlay;
  const PlaybackIcon = isPlaybackActive && isPlaying ? Pause : Play;
  const playbackLabel = isPlaybackActive && isPlaying ? "Pause" : "Play";

  const handlePlay = (event) => {
    event.stopPropagation();
    primaryAction?.();
  };

  const handleLike = (event) => {
    event.stopPropagation();
    onLike?.();
  };

  const handleCardClick = () => {
    if (href) {
      navigate(href);
      return;
    }

    if (isMobileViewport) {
      primaryAction?.();
    }
  };

  const handleMobileLinkClick = (event) => {
    if (!isMobileViewport) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    primaryAction?.();
  };

  return (
    <article
      onClick={handleCardClick}
      className={[
        "group grid items-center rounded-[8px] cursor-pointer transition hover:bg-black/[0.05] dark:hover:bg-white/[0.06]",
        mobileLayoutClassName,
        desktopLayoutClassName,
        resolvedClasses.container,
        className,
      ].join(" ")}
    >
      <div className="flex items-center justify-center text-sm text-[#71717a] dark:text-[#a1a1aa]">
        <span className={[resolvedClasses.index, indexClassName].join(" ").trim()}>{index}</span>
        <button
          type="button"
          onClick={handlePlay}
          aria-label={`${playbackLabel} ${title}`}
          className="
            hidden h-8 w-8 items-center justify-center rounded-full text-[#111111]
            sm:group-hover:inline-flex dark:text-white
          "
        >
          <PlaybackIcon className="h-4 w-4 fill-current" />
        </button>
      </div>

      <div className="flex min-w-0 items-center gap-3">
        {image ? (
          <img
            src={image}
            alt={title}
            className={resolvedClasses.image}
          />
        ) : (
          <div className={resolvedClasses.fallback}>
            N/A
          </div>
        )}

        <div className="min-w-0">
          {href ? (
            <Link to={href} onClick={handleMobileLinkClick} className="hidden min-w-0 sm:block">
              <p className={`${resolvedClasses.title} hover:underline`}>
                {title}
              </p>
            </Link>
          ) : (
            null
          )}
          <p className={`${resolvedClasses.title} sm:hidden`}>
            {title}
          </p>
          {!href ? (
            <p className={`hidden sm:block ${resolvedClasses.title}`}>
              {title}
            </p>
          ) : null}
          <div className={resolvedClasses.meta}>
            {explicit ? (
              <span
                className="
                  inline-flex h-4 shrink-0 items-center rounded-[4px] bg-black/10 px-1.5
                  text-[10px] font-semibold uppercase text-[#3f3f46]
                  dark:bg-white/12 dark:text-[#e4e4e7]
                "
              >
                E
              </span>
            ) : null}
            {artistId ? (
              <Link
                to={`/artists/${artistId}`}
                onClick={handleMobileLinkClick}
                className="hidden truncate hover:underline sm:inline"
              >
                {artist}
              </Link>
            ) : (
              null
            )}
            <span className="truncate sm:hidden">{artist}</span>
            {!artistId ? (
              <span className="hidden truncate sm:inline">{artist}</span>
            ) : null}
            {duration ? (
              <span className={resolvedClasses.mobileDuration}>
                {duration}
              </span>
            ) : null}
            {resolvedMobileMetaItems.map((item, indexValue) => {
              const isObjectItem =
                typeof item === "object" && item !== null && "content" in item;
              const content = isObjectItem ? item.content : item;
              const itemClassName = isObjectItem ? item.className : "";

              return (
                <span
                  key={`${title}-mobile-meta-${indexValue}`}
                  className={itemClassName}
                >
                  {content}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {showLikeButton ? (
        <div className="flex items-center justify-end sm:justify-center">
          {liked ? (
            <button
              type="button"
              onClick={handleLike}
              aria-label={`Unlike ${title}`}
              className="hidden h-8 w-8 items-center justify-center text-[#1ed760] sm:inline-flex"
            >
              <CheckCircle2 className="h-4.5 w-4.5 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLike}
              aria-label={`Like ${title}`}
              className="
                hidden h-8 w-8 items-center justify-center text-[#71717a]
                transition sm:inline-flex sm:opacity-0 sm:group-hover:opacity-100 dark:text-[#a1a1aa]
              "
            >
              <CheckCircle2 className="h-4.5 w-4.5" />
            </button>
          )}
        </div>
      ) : null}

      {resolvedDesktopMetaColumns.length > 0 ? (
        resolvedDesktopMetaColumns.map((item, indexValue) => {
          const isObjectItem =
            typeof item === "object" && item !== null && "content" in item;
          const content = isObjectItem ? item.content : item;
          const itemClassName = isObjectItem ? item.className : resolvedClasses.desktopMeta;

          return (
            <div
              key={`${title}-desktop-meta-${indexValue}`}
              className={itemClassName}
            >
              {content}
            </div>
          );
        })
      ) : (
        <>
          <div className={resolvedClasses.desktopMeta}>
            {duration}
          </div>

          <div className="hidden items-center justify-end sm:flex">
            {trackId ? <TrackTwoLevelMenu trackId={trackId} /> : null}
          </div>
        </>
      )}
    </article>
  );
};

export default TrackCard;
