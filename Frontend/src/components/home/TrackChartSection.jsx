import { Link } from "react-router-dom";
import LoadingState from "../common/LoadingState";
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
        <LoadingState message="Đang tải nội dung..." className="min-h-[12rem]" />
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
