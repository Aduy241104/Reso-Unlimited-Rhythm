import { Disc3, Headphones, ListMusic, Mic2, Music2, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TrackTwoLevelMenu from "../trackMenu/TrackTwoLevelMenu";
import { formatTrackDuration } from "../../utils/albumDetail";
import {
  resolveSearchItemImage,
  resolveSearchItemPath,
  resolveSearchItemPrimaryText,
  resolveSearchItemSecondaryText,
  resolveSearchItemTypeLabel,
  SEARCH_RESULT_TYPES,
} from "./searchResultUtils";

const SearchResultItem = ({
  item,
  type,
  className = "",
  compact = false,
  onSelect,
  onPlay,
  isActive = false,
  showTrackMenu = false,
  showDuration = false,
}) => {
  const navigate = useNavigate();
  const detailPath = resolveSearchItemPath(item, type);
  const primaryText = resolveSearchItemPrimaryText(item, type);
  const typeLabel = resolveSearchItemTypeLabel(type);
  const secondaryText = resolveSearchItemSecondaryText(item, type);
  const imageSource = resolveSearchItemImage(item, type);
  const itemId = item?._id || item?.id || item?.trackId || item?.artistId || item?.albumId || "";
  const isTrack = type === SEARCH_RESULT_TYPES.song || type === "track";
  const shouldShowTrackMenu = showTrackMenu && isTrack && Boolean(itemId);
  const durationLabel = isTrack ? formatTrackDuration(item?.duration) : "";
  const shouldShowPlayButton =
    typeof onPlay === "function" &&
    ((type === SEARCH_RESULT_TYPES.podcast && Boolean(item?.audioUrl)) ||
      (type === SEARCH_RESULT_TYPES.song && Array.isArray(item?.audioFiles) && item.audioFiles.length > 0));

  const handleClick = () => {
    if (!detailPath) {
      return;
    }

    onSelect?.(item, type);
    navigate(detailPath);
  };

  const handlePlay = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onPlay?.(item, type);
  };

  const typeIcon =
    type === SEARCH_RESULT_TYPES.artist ? (
      <Mic2 className="h-3.5 w-3.5" />
    ) : type === SEARCH_RESULT_TYPES.album ? (
      <Disc3 className="h-3.5 w-3.5" />
    ) : type === SEARCH_RESULT_TYPES.podcast ? (
      <Headphones className="h-3.5 w-3.5" />
    ) : type === SEARCH_RESULT_TYPES.playlist ? (
      <ListMusic className="h-3.5 w-3.5" />
    ) : (
      <Music2 className="h-3.5 w-3.5" />
    );

  return (
    <div
      className={[
        "flex w-full items-center gap-3 rounded-2xl px-3 transition",
        compact ? "py-2.5" : "py-3.5",
        detailPath ? "hover:bg-[#1f1f1f]" : "opacity-70",
        isActive ? "bg-white/[0.08]" : "",
        className,
      ].filter(Boolean).join(" ")}
    >
      <button
        type="button"
        onClick={handleClick}
        disabled={!detailPath}
        className={[
          "flex min-w-0 flex-1 items-center gap-3 text-left",
          detailPath
            ? "focus:outline-none focus:ring-2 focus:ring-[#1ed760]/40"
            : "cursor-default",
        ].join(" ")}
      >
        <img
          src={imageSource}
          alt={primaryText}
          className={[
            "shrink-0 bg-[#202020] object-cover",
            type === SEARCH_RESULT_TYPES.artist ? "rounded-full" : "rounded-md",
            compact ? "h-12 w-12" : "h-14 w-14 sm:h-16 sm:w-16",
          ].join(" ")}
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white sm:text-base">
            {primaryText}
          </p>
          <p className="truncate text-xs text-[#b3b3b3] sm:text-sm">{secondaryText}</p>
        </div>
      </button>

      <div className="hidden shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-[#b3b3b3] sm:flex">
        {typeIcon}
        <span>{typeLabel}</span>
      </div>

      {shouldShowPlayButton ? (
        <button
          type="button"
          onClick={handlePlay}
          aria-label={`Phát ${primaryText}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E0FFE0] via-[#D3FFCE] to-[#FFD700] text-black shadow-[0_10px_22px_rgba(30,215,96,0.25)] transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#1ed760]"
        >
          <Play className="h-4 w-4 fill-current" />
        </button>
      ) : null}

      {showDuration && isTrack ? (
        <span className="hidden shrink-0 text-xs tabular-nums text-[#91879d] sm:block">
          {durationLabel}
        </span>
      ) : null}

      {shouldShowTrackMenu ? (
        <div className="shrink-0" onClick={(event) => event.stopPropagation()}>
          <TrackTwoLevelMenu trackId={itemId} track={item} />
        </div>
      ) : null}
    </div>
  );
};

export default SearchResultItem;
