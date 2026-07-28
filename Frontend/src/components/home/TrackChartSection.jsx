import { Link } from "react-router-dom";
import ContentCardSkeleton from "../content/ContentCardSkeleton";
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
  isArtistSection = false,
}) => {
  const getLeadLabel = (item) => {
    const topTrackTitle = item?.raw?.topTracks?.[0]?.track?.title;
    const topArtistName = item?.raw?.topArtists?.[0]?.artist?.name;

    return topTrackTitle || topArtistName || item?.title || "";
  };

  const getVariant = (item) => {
    if (item?.raw?.contentType === "artist" || item?.raw?.topArtists) {
      return "artist";
    }

    if (item?.raw?.period === "monthly") {
      return "monthly";
    }

    return "daily";
  };

  return (
    <section className="min-w-0 space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-2.5 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1 sm:space-y-1.5">
          { label ? (
            <p className="text-[9px] font-normal uppercase tracking-[0.18em] text-[#71717a] dark:text-[#a1a1aa] sm:text-[10px] sm:tracking-[0.2em]">
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
              inline-flex self-start text-xs font-medium text-white transition hover:text-white/70
              sm:text-[13px]
            "
          >
            { actionLabel }
          </Link>
        ) : null }
      </div>

      { isLoading ? (
        <div
          className={ [
            "mt-1 min-w-0 gap-3 pb-2 sm:mt-2 sm:gap-4",
            isArtistSection
              ? "flex snap-x snap-mandatory overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              : "flex snap-x snap-mandatory overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-5 lg:overflow-visible",
          ].join(" ") }
        >
          { Array.from({ length: 5 }).map((_, index) => (
            <div
              key={ index }
              className={ [
                "shrink-0 snap-start",
                isArtistSection
                  ? "h-[16.75rem] w-[15rem] min-w-[15rem] animate-pulse rounded-[16px] border border-black/5 bg-white/70 p-2.5 dark:border-white/10 dark:bg-[#181818] sm:h-[18.5rem] sm:w-[17.5rem] sm:min-w-[17.5rem] sm:rounded-[18px] sm:p-3 lg:h-[20rem] lg:w-[19rem] lg:min-w-[19rem]"
                  : "h-[12.75rem] w-[8.5rem] min-w-[8.5rem] sm:h-[15.25rem] sm:w-[10.75rem] sm:min-w-[10.75rem] lg:h-auto lg:w-auto lg:min-w-0",
              ].join(" ") }
            >
              { isArtistSection ? (
                <>
                  <div className="relative mx-auto aspect-square w-[76%] rounded-full bg-[#e5e5e5] dark:bg-[#282828] sm:w-[78%]">
                    <div className="absolute left-2 top-2 h-5 w-10 rounded-full bg-black/8 dark:bg-white/10 sm:left-2.5 sm:top-2.5 sm:h-6 sm:w-11" />
                    <div className="absolute right-2 top-2 h-5 w-14 rounded-full bg-black/8 dark:bg-white/10 sm:right-2.5 sm:top-2.5 sm:h-6 sm:w-16" />
                  </div>
                  <div className="mt-2.5 space-y-1.5 sm:mt-3 sm:space-y-2">
                    <div className="h-3.5 w-4/5 rounded-full bg-[#d4d4d8] dark:bg-[#343434] sm:h-4" />
                    <div className="h-2.5 w-full rounded-full bg-[#e5e5e5] dark:bg-[#2d2d2d] sm:h-3" />
                    <div className="h-2.5 w-2/3 rounded-full bg-[#e5e5e5] dark:bg-[#2d2d2d] sm:h-3" />
                  </div>
                  <div className="mt-2.5 h-2.5 w-20 rounded-full bg-[#e4e4e7] dark:bg-[#242424] sm:mt-3 sm:h-3 sm:w-24" />
                </>
              ) : (
                <ContentCardSkeleton />
              ) }
            </div>
          )) }
        </div>
      ) : items.length > 0 ? (
        <div
          className={ [
            "mt-1 min-w-0 gap-3 pb-2 sm:mt-2 sm:gap-4",
            isArtistSection
              ? "flex snap-x snap-mandatory overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              : "flex snap-x snap-mandatory overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-5 lg:overflow-visible",
          ].join(" ") }
        >
          { items.map((item) => (
            <div
              key={ item.id }
              className={ [
                "shrink-0 snap-start",
                isArtistSection
                  ? "h-[16.75rem] w-[15rem] min-w-[15rem] sm:h-[18.5rem] sm:w-[17.5rem] sm:min-w-[17.5rem] lg:h-[20rem] lg:w-[19rem] lg:min-w-[19rem]"
                  : "h-[12.75rem] w-[8.5rem] min-w-[8.5rem] sm:h-[15.25rem] sm:w-[10.75rem] sm:min-w-[10.75rem] lg:h-auto lg:w-auto lg:min-w-0",
              ].join(" ") }
            >
              <TrackChartCard
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
            px-4 py-6 text-center text-sm text-[#52525b] dark:text-[#a1a1aa]
          "
        >
          { emptyMessage }
        </div>
      ) }
    </section>
  );
};

export default TrackChartSection;
