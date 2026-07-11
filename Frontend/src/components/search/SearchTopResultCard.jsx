import { Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  resolveSearchItemImage,
  resolveSearchItemPath,
  resolveSearchItemPrimaryText,
  resolveSearchItemTypeLabel,
  SEARCH_RESULT_TYPES,
} from "./SearchResultItem";

const SearchTopResultCard = ({ item, type }) => {
  const navigate = useNavigate();
  const detailPath = resolveSearchItemPath(item, type);
  const primaryText = resolveSearchItemPrimaryText(item, type);
  const typeLabel = resolveSearchItemTypeLabel(type);
  const imageSource = resolveSearchItemImage(item, type);

  const handleNavigate = () => {
    if (!detailPath) {
      return;
    }

    navigate(detailPath);
  };

  return (
    <button
      type="button"
      onClick={handleNavigate}
      disabled={!detailPath}
      className={[
        "group flex w-full items-center gap-4 rounded-xl bg-[#2a2a2a] p-4 text-left transition",
        detailPath
          ? "hover:bg-[#333333] focus:outline-none focus:ring-2 focus:ring-[#1ed760]/40"
          : "cursor-default opacity-70",
      ].join(" ")}
    >
      <img
        src={imageSource}
        alt={primaryText}
        className={[
          "h-20 w-20 shrink-0 bg-[#1a1a1a] object-cover",
          type === SEARCH_RESULT_TYPES.artist ? "rounded-full" : "rounded-md",
        ].join(" ")}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-xl font-bold text-white sm:text-2xl">
          {primaryText}
        </p>
        <p className="mt-2 text-sm text-[#b3b3b3]">{typeLabel}</p>
      </div>

      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1ed760] text-black shadow-[0_12px_28px_rgba(30,215,96,0.28)] transition group-hover:scale-105">
        <Play className="ml-0.5 h-5 w-5 fill-current" />
      </span>
    </button>
  );
};

export default SearchTopResultCard;
