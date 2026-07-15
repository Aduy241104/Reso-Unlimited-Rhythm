import ContentCard from "./ContentCard";
import ContentCardSkeleton from "./ContentCardSkeleton";

const ContentCardSection = ({
  label,
  title,
  description,
  items = [],
  isLoading = false,
  emptyMessage = "No content available.",
  onPlay,
  playButtonAriaLabel = true,
}) => {
  return (
    <section className="min-w-0 space-y-3 sm:space-y-4">
      <div className="mx-px space-y-1 sm:mx-0 sm:space-y-1.5">
        { label ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#71717a] dark:text-[#a1a1aa] sm:text-xs sm:tracking-[0.28em]">
            { label }
          </p>
        ) : null }

        <h2 className="text-base font-semibold text-[#111111] dark:text-white sm:text-2xl">
          { title }
        </h2>
        { description ? (
          <p className="max-w-2xl text-xs leading-5 text-[#52525b] dark:text-[#a1a1aa] sm:text-sm sm:leading-6">
            { description }
          </p>
        ) : null }
      </div>

      { isLoading ? (
        <div className="flex min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4">
          { Array.from({ length: 5 }).map((_, index) => (
            <div
              key={ index }
              className="h-[12.75rem] w-[8.5rem] min-w-[8.5rem] shrink-0 snap-start sm:h-[15.25rem] sm:w-[10.75rem] sm:min-w-[10.75rem] lg:h-[17rem] lg:w-[12rem] lg:min-w-[12rem]"
            >
              <ContentCardSkeleton />
            </div>
          )) }
        </div>
      ) : items.length > 0 ? (
        <div className="mt-1 flex min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mt-2 sm:gap-4">
          { items.map((item) => (
            <div
              key={ item.id }
              className="h-[12.75rem] w-[8.5rem] min-w-[8.5rem] shrink-0 snap-start sm:h-[15.25rem] sm:w-[10.75rem] sm:min-w-[10.75rem] lg:h-[17rem] lg:w-[12.5rem] lg:min-w-[12.5rem]"
            >
              <ContentCard
                image={ item.image }
                title={ item.title }
                subtitle={ item.subtitle }
                type={ item.type }
                href={ item.href }
                onPlay={ () => onPlay?.(item) }
                playButtonAriaLabel={ playButtonAriaLabel }
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

export default ContentCardSection;
