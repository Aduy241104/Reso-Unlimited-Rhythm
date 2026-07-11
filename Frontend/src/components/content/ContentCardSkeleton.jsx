const ContentCardSkeleton = () => {
  return (
    <div
      className="
        animate-pulse rounded-[16px] border border-black/5 bg-white/70 p-2.5
        dark:border-white/10 dark:bg-[#181818]
        sm:rounded-[18px] sm:p-3
      "
    >
      <div className="aspect-square rounded-[12px] bg-[#e5e5e5] dark:bg-[#282828] sm:rounded-[14px]" />
      <div className="mt-2.5 space-y-1.5 sm:mt-3 sm:space-y-2">
        <div className="h-2.5 w-16 rounded-full bg-[#e5e5e5] dark:bg-[#282828] sm:h-3 sm:w-20" />
        <div className="h-3.5 w-4/5 rounded-full bg-[#d4d4d8] dark:bg-[#343434] sm:h-4" />
        <div className="h-2.5 w-2/3 rounded-full bg-[#e4e4e7] dark:bg-[#2d2d2d] sm:h-3" />
        <div className="h-2.5 w-full rounded-full bg-[#f0f0f0] dark:bg-[#242424] sm:h-3" />
      </div>
    </div>
  );
};

export default ContentCardSkeleton;
