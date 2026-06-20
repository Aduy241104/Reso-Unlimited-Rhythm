import { Heart } from "lucide-react";

const UserFavoriteLibraryItem = ({
  totalItems = 0,
  isActive = false,
  onClick,
  className = "",
}) => {
  if (Number(totalItems) <= 0) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={ onClick }
      className={ [
        "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition",
        isActive
          ? "bg-[#241f28] text-[#f7f1ea]"
          : "text-[#b8b0aa] hover:bg-[#241f28] hover:text-[#f7f1ea]",
        className,
      ].join(" ").trim() }
    >
      <div
        className="
          flex h-12 w-12 shrink-0 items-center justify-center rounded-md
          bg-[linear-gradient(135deg,#e11d48_0%,#ec4899_40%,#f472b6_70%,#fbcfe8_100%)]
          text-white shadow-[0_10px_28px_rgba(225,29,72,0.28)]
        "
      >
        <Heart className="h-5 w-5 fill-current text-white" />
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-inherit">
          Bài hát đã thích
        </p>
        <p className="truncate text-xs text-[#b8b0aa]">
          Danh sách phát • { totalItems } bài hát
        </p>
      </div>
    </button>
  );
};

export default UserFavoriteLibraryItem;
