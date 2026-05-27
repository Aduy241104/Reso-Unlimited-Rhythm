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
          { Array.from({ length: 5 }).map((_, index) => (
            <div key={ index } className="w-[9.75rem] min-w-[9.75rem] sm:w-[12rem] sm:min-w-[12rem]">
              <ContentCardSkeleton />
            </div>
          )) }
        </div>
      ) : items.length > 0 ? (
        <div className="mt-2 flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          { items.map((item) => (
            <div
              key={ item.id }
              className="w-[9.75rem] min-w-[9.75rem] sm:w-[12rem] sm:min-w-[12rem] lg:w-[12.5rem] lg:min-w-[12.5rem]"
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
