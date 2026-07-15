import { Heart } from "lucide-react";

const formatLikeCount = (value) => {
  const likeCount = Number(value);

  if (!Number.isFinite(likeCount) || likeCount <= 0) {
    return "Chưa có lượt thích";
  }

  if (likeCount >= 1000000) {
    return `${(likeCount / 1000000).toFixed(likeCount >= 10000000 ? 0 : 1)}M l\u01b0\u1ee3t th\u00edch`;
  }

  if (likeCount >= 1000) {
    return `${(likeCount / 1000).toFixed(likeCount >= 100000 ? 0 : 1)}K l\u01b0\u1ee3t th\u00edch`;
  }

  return `${new Intl.NumberFormat("vi-VN").format(likeCount)} l\u01b0\u1ee3t th\u00edch`;
};

const TrackDetailLikeSection = ({
  isLiked,
  likeCount,
  isLikeLoading = false,
  onToggleLike,
}) => (
  <section
    className="sm:p-2" >
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <div
          className="
            w-full rounded-[18px] border border-black/6 bg-black/[0.03] px-4 py-3 sm:min-w-[11rem] sm:w-auto
            dark:border-white/10 dark:bg-white/[0.04]
          "
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#71717a] dark:text-[#a1a1aa]">
            { "L\u01b0\u1ee3t th\u00edch" }
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-[#111111] dark:text-white">
            { new Intl.NumberFormat("vi-VN").format(Number(likeCount) || 0) }
          </p>
          <p className="mt-1 text-sm text-[#52525b] dark:text-[#a1a1aa]">
            { formatLikeCount(likeCount) }
          </p>
        </div>

        <button
          type="button"
          onClick={ onToggleLike }
          disabled={ isLikeLoading }
          aria-pressed={ isLiked }
          className={ [
            "inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition",
            isLiked
              ? "bg-[#1ed760] text-[#04130a] hover:brightness-105"
              : "border border-black/8 bg-white text-[#18181b] hover:bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.12]",
          ].join(" ") }
        >
          <Heart className={ `h-4.5 w-4.5 ${isLiked ? "fill-current" : ""}` } />
          { isLikeLoading
            ? "\u0110ang x\u1eed l\u00fd..."
            : (isLiked ? "\u0110\u00e3 th\u00edch" : "Th\u00edch b\u00e0i h\u00e1t") }
        </button>
      </div>
    </div>
  </section>
);

export default TrackDetailLikeSection;
