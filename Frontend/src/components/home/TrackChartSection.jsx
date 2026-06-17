import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import TrackChartCard from "./TrackChartCard";

const TrackChartSection = ({
  label = "Bảng xếp hạng",
  title,
  description,
  items = [],
  isLoading = false,
  emptyMessage = "No content available.",
  onPlay,
  showPlayButton = true,
  actionLabel = "",
  actionHref = "",
}) => {
  const getLeadLabel = (item) => {
    const topTrackTitle = item?.raw?.topTracks?.[0]?.track?.title;
    const topArtistName = item?.raw?.topArtists?.[0]?.artist?.name;

    return topTrackTitle || topArtistName || item?.title || "";
  };

  const getVariant = (item) => {
    if (item?.raw?.topArtists) {
      return "artist";
    }

    if (item?.raw?.period === "monthly") {
      return "monthly";
    }

    return "daily";
  };

  return (
    <section className="space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-2.5 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1 sm:space-y-1.5">
          { label ? (
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#71717a] dark:text-[#a1a1aa] sm:text-xs sm:tracking-[0.28em]">
              { label }
            </p>
          ) : null }
          <h2 className="text-base font-semibold tracking-tight text-[#111111] dark:text-white sm:text-2xl">
            { title }
          </h2>
          { description ? (
            <p className="max-w-2xl text-xs leading-5 text-[#52525b] dark:text-[#a1a1aa] sm:text-sm sm:leading-6">
              { description }
            </p>
          ) : null }
        </div>

        { actionLabel && actionHref ? (
          <Link
            to={ actionHref }
            className="
              inline-flex items-center gap-2 self-start rounded-full border border-black/8
              bg-black/[0.02] px-2.5 py-1.5 text-xs font-medium text-[#18181b] transition
              hover:bg-black/[0.04] dark:border-white/[0.08] dark:bg-white/[0.03]
              dark:text-white/86 dark:hover:bg-white/[0.05] sm:px-3 sm:py-2 sm:text-[13px]
            "
          >
            { actionLabel }
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#8b7bff]/12 text-[#6d5efc] dark:text-[#c9c2ff] sm:h-6 sm:w-6">
              <ArrowRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            </span>
          </Link>
        ) : null }
      </div>

      { isLoading ? (
        <div className="mt-1 flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mt-2 sm:gap-4">
          { Array.from({ length: 3 }).map((_, index) => (
            <div
              key={ index }
              className="w-[8.5rem] min-w-[8.5rem] sm:w-[10.75rem] sm:min-w-[10.75rem] lg:w-[12.5rem] lg:min-w-[12.5rem]"
            >
              <div
                className="
                  animate-pulse rounded-[12px] border border-black/5 bg-white/70 p-1
                  dark:border-white/10 dark:bg-[#181818] sm:rounded-[9px] sm:p-2
                "
              >
                <div className="relative aspect-square rounded-[9px] bg-[#e5e5e5] dark:bg-[#282828] sm:rounded-[8px]">
                  <div className="absolute left-2 top-2 h-5 w-10 rounded-full bg-black/8 dark:bg-white/10 sm:left-2.5 sm:top-2.5 sm:h-6 sm:w-11" />
                  <div className="absolute right-2 top-2 h-5 w-14 rounded-full bg-black/8 dark:bg-white/10 sm:right-2.5 sm:top-2.5 sm:h-6 sm:w-16" />
                </div>
                <div className="mt-2.5 space-y-1.5 sm:mt-3 sm:space-y-2">
                  <div className="h-3.5 w-4/5 rounded-full bg-[#d4d4d8] dark:bg-[#343434] sm:h-4" />
                  <div className="h-2.5 w-full rounded-full bg-[#e5e5e5] dark:bg-[#2d2d2d] sm:h-3" />
                </div>
              </div>
            </div>
          )) }
        </div>
      ) : items.length > 0 ? (
        <div className="mt-1 flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mt-2 sm:gap-4">
          { items.map((item, index) => (
            <div
              key={ item.id }
              className="w-[8.5rem] min-w-[8.5rem] sm:w-[10.75rem] sm:min-w-[10.75rem] lg:w-[12.5rem] lg:min-w-[12.5rem]"
            >
              <TrackChartCard
                index={ index + 1 }
                image={ item.image }
                title={ item.title }
                subtitle={ item.subtitle }
                type={ item.type }
                href={ item.href }
                heroText={ getLeadLabel(item) }
                variant={ getVariant(item) }
                onPlay={ () => onPlay?.(item) }
                showPlayButton={ showPlayButton }
              />
            </div>
          )) }
        </div>
      ) : (
        <div
          className="
            rounded-[18px] border border-dashed border-black/10 bg-black/[0.03] px-4 py-6
            text-sm text-[#52525b] dark:border-white/10 dark:bg-white/[0.03] dark:text-[#a1a1aa]
          "
        >
          { emptyMessage }
        </div>
      ) }
    </section>
  );
};

export default TrackChartSection;
