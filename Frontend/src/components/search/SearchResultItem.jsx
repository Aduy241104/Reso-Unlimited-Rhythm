import { Disc3, Mic2, Music2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TrackTwoLevelMenu from "../trackMenu/TrackTwoLevelMenu";
import { routePaths } from "../../routes/routePaths";
import { createPlaceholderImage } from "../../utils/albumDetail";

export const SEARCH_RESULT_TYPES = {
  song: "song",
  artist: "artist",
  album: "album",
};

const resolveImageCandidate = (candidate) => {
  if (typeof candidate === "string" && candidate.trim()) {
    return candidate.trim();
  }

  if (Array.isArray(candidate)) {
    const firstImage = candidate.find(
      (item) => typeof item === "string" && item.trim()
    );

    return firstImage ? firstImage.trim() : "";
  }

  return "";
};

const resolveItemId = (item) =>
  item?._id || item?.id || item?.trackId || item?.artistId || item?.albumId || "";

const collectArtistNames = (candidate) => {
  if (Array.isArray(candidate)) {
    return candidate
      .map((item) => {
        if (typeof item === "string") {
          return item.trim();
        }

        return (
          item?.stageName ||
          item?.artistName ||
          item?.displayName ||
          item?.name ||
          item?.fullName ||
          ""
        ).trim();
      })
      .filter(Boolean);
  }

  if (typeof candidate === "string") {
    return candidate
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
  }

  return [];
};

export const resolveSearchItemPrimaryText = (item, type) => {
  if (type === SEARCH_RESULT_TYPES.artist) {
    return (
      item?.stageName ||
      item?.artistName ||
      item?.displayName ||
      item?.name ||
      item?.fullName ||
      "Nghệ sĩ chưa đặt tên"
    );
  }

  if (type === SEARCH_RESULT_TYPES.album) {
    return item?.title || item?.name || item?.albumName || "Album chưa đặt tên";
  }

  return item?.title || item?.name || item?.trackName || "Bài hát chưa đặt tên";
};

export const resolveSearchItemTypeLabel = (type) => {
  if (type === SEARCH_RESULT_TYPES.artist) {
    return "Nghệ sĩ";
  }

  if (type === SEARCH_RESULT_TYPES.album) {
    return "Album";
  }

  return "Bài hát";
};

const resolveSearchItemSecondaryText = (item, type) => {
  const typeLabel = resolveSearchItemTypeLabel(type);
  const artistNames = collectArtistNames(
    item?.artists || item?.artistNames || item?.artistName || item?.artist
  );

  if (type === SEARCH_RESULT_TYPES.song && artistNames.length > 0) {
    return `${typeLabel} • ${artistNames.join(", ")}`;
  }

  return typeLabel;
};

export const resolveSearchItemImage = (item, type) => {
  if (type === SEARCH_RESULT_TYPES.song) {
    return (
      resolveImageCandidate(item?.avatar) ||
      resolveImageCandidate(item?.coverImage) ||
      resolveImageCandidate(item?.image) ||
      resolveImageCandidate(item?.album?.coverImage) ||
      resolveImageCandidate(item?.album?.image) ||
      createPlaceholderImage(resolveSearchItemPrimaryText(item, type), "#f59e0b", "#111827")
    );
  }

  if (type === SEARCH_RESULT_TYPES.artist) {
    return (
      resolveImageCandidate(item?.avatar) ||
      resolveImageCandidate(item?.image) ||
      resolveImageCandidate(item?.photo) ||
      createPlaceholderImage(resolveSearchItemPrimaryText(item, type), "#10b981", "#111827")
    );
  }

  return (
    resolveImageCandidate(item?.coverImage) ||
    resolveImageCandidate(item?.image) ||
    resolveImageCandidate(item?.thumbnail) ||
    createPlaceholderImage(resolveSearchItemPrimaryText(item, type), "#3b82f6", "#111827")
  );
};

export const resolveSearchItemPath = (item, type) => {
  const itemId = resolveItemId(item);

  if (!itemId) {
    return "";
  }

  if (type === SEARCH_RESULT_TYPES.artist) {
    return routePaths.artistBrowseProfile(itemId);
  }

  if (type === SEARCH_RESULT_TYPES.album) {
    return routePaths.albumDetail(itemId);
  }

  return routePaths.trackDetail(itemId);
};

const resolveTypeIcon = (type) => {
  if (type === SEARCH_RESULT_TYPES.artist) {
    return Mic2;
  }

  if (type === SEARCH_RESULT_TYPES.album) {
    return Disc3;
  }

  return Music2;
};

const SearchResultItem = ({
  item,
  type,
  className = "",
  compact = false,
  onSelect,
  showTrackMenu = false,
}) => {
  const navigate = useNavigate();
  const detailPath = resolveSearchItemPath(item, type);
  const TypeIcon = resolveTypeIcon(type);
  const primaryText = resolveSearchItemPrimaryText(item, type);
  const typeLabel = resolveSearchItemTypeLabel(type);
  const secondaryText = resolveSearchItemSecondaryText(item, type);
  const imageSource = resolveSearchItemImage(item, type);
  const itemId = resolveItemId(item);
  const isTrack = type === SEARCH_RESULT_TYPES.song || type === "track";
  const shouldShowTrackMenu = showTrackMenu && isTrack && Boolean(itemId);

  const handleClick = () => {
    if (!detailPath) {
      return;
    }

    if (typeof onSelect === "function") {
      onSelect(item, type);
    }

    navigate(detailPath);
  };

  return (
    <div
      className={[
        "flex w-full items-center gap-3 rounded-2xl px-3 transition",
        compact ? "py-2.5" : "py-3.5",
        detailPath ? "hover:bg-[#1f1f1f]" : "opacity-70",
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
          <p className="truncate text-xs text-[#b3b3b3] sm:text-sm">
            {secondaryText}
          </p>
        </div>
      </button>

      <div className="hidden shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-[#b3b3b3] sm:flex">
        <TypeIcon className="h-3.5 w-3.5" />
        <span>{typeLabel}</span>
      </div>

      {shouldShowTrackMenu ? (
        <div
          className="shrink-0"
          onClick={(event) => event.stopPropagation()}
        >
          <TrackTwoLevelMenu trackId={itemId} />
        </div>
      ) : null}
    </div>
  );
};

export default SearchResultItem;
