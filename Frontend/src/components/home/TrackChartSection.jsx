import { ArrowRight, BarChart3 } from "lucide-react";
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
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1.5">
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8b7bff]">
            <BarChart3 className="h-3.5 w-3.5" />
            { label }
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-[#111111] dark:text-white">
            { title }
          </h2>
          { description ? (
            <p className="max-w-2xl text-sm text-[#52525b] dark:text-[#a1a1aa]">
              { description }
            </p>
          ) : null }
        </div>

        { actionLabel && actionHref ? (
          <Link
            to={ actionHref }
            className="
              inline-flex items-center gap-2 self-start rounded-full border border-black/8
              bg-black/[0.02] px-3 py-2 text-[13px] font-medium text-[#18181b] transition
              hover:bg-black/[0.04] dark:border-white/[0.08] dark:bg-white/[0.03]
              dark:text-white/86 dark:hover:bg-white/[0.05]
            "
          >
            { actionLabel }
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#8b7bff]/12 text-[#6d5efc] dark:text-[#c9c2ff]">
              <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        ) : null }
      </div>

      { isLoading ? (
        <div className="mt-2 flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          { Array.from({ length: 3 }).map((_, index) => (
            <div
              key={ index }
              className="
                w-[10.75rem] min-w-[10.75rem] animate-pulse rounded-[18px] border border-black/5 bg-white/70 p-3
                dark:border-white/10 dark:bg-[#181818] sm:w-[12.75rem] sm:min-w-[12.75rem]
              "
            >
              <div className="relative aspect-square rounded-[14px] bg-[#e5e5e5] dark:bg-[#282828]">
                <div className="absolute left-2.5 top-2.5 h-6 w-11 rounded-full bg-black/8 dark:bg-white/10" />
                <div className="absolute right-2.5 top-2.5 h-6 w-16 rounded-full bg-black/8 dark:bg-white/10" />
              </div>
              <div className="mt-3 space-y-2">
                <div className="h-4 w-4/5 rounded-full bg-[#d4d4d8] dark:bg-[#343434]" />
                <div className="h-3 w-full rounded-full bg-[#e5e5e5] dark:bg-[#2d2d2d]" />
                <div className="h-3 w-2/3 rounded-full bg-[#e5e5e5] dark:bg-[#2d2d2d]" />
              </div>
              <div className="mt-3 h-3 w-24 rounded-full bg-[#e4e4e7] dark:bg-[#242424]" />
            </div>
          )) }
        </div>
      ) : items.length > 0 ? (
        <div className="mt-2 flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          { items.map((item, index) => (
            <div
              key={ item.id }
              className="w-[10.75rem] min-w-[10.75rem] sm:w-[12.75rem] sm:min-w-[12.75rem] lg:w-[13.25rem] lg:min-w-[13.25rem]"
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
