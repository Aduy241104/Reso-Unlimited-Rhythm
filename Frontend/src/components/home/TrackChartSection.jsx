import TrackChartCard from "./TrackChartCard";

const TrackChartSection = ({
  label,
  title,
  description,
  items = [],
  isLoading = false,
  emptyMessage = "No content available.",
  onPlay,
  showPlayButton = true,
}) => {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        { label ? (
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#71717a] dark:text-[#a1a1aa]">
            { label }
          </p>
        ) : null }

        <h2 className="text-2xl font-semibold text-[#111111] dark:text-white">
          { title }
        </h2>

        { description ? (
          <p className="max-w-2xl text-sm text-[#52525b] dark:text-[#a1a1aa]">
            { description }
          </p>
        ) : null }
      </div>

      { isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          { Array.from({ length: 2 }).map((_, index) => (
            <div
              key={ index }
              className="w-[16rem] min-w-[16rem] sm:w-[18rem] sm:min-w-[18rem] lg:w-[19rem] lg:min-w-[19rem]"
            >
              <div className="animate-pulse space-y-3 rounded-[22px] p-2">
                <div className="aspect-[16/10] rounded-[20px] bg-black/8 dark:bg-white/10" />
                <div className="space-y-2 px-1">
                  <div className="h-4 w-36 rounded-full bg-black/8 dark:bg-white/10" />
                  <div className="h-3 w-44 rounded-full bg-black/8 dark:bg-white/10" />
                  <div className="h-3 w-28 rounded-full bg-black/8 dark:bg-white/10" />
                </div>
              </div>
            </div>
          )) }
        </div>
      ) : items.length > 0 ? (
        <div className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          { items.map((item) => (
            <div
              key={ item.id }
              className="w-[16rem] min-w-[16rem] sm:w-[18rem] sm:min-w-[18rem] lg:w-[19rem] lg:min-w-[19rem]"
            >
              <TrackChartCard
                image={ item.image }
                title={ item.title }
                subtitle={ item.subtitle }
                type={ item.type }
                href={ item.href }
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
