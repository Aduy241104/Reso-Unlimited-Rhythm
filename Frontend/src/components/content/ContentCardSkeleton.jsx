const ContentCardSkeleton = () => {
  return (
    <div
      className="
        animate-pulse rounded-[18px] border border-black/5 bg-white/70 p-3
        dark:border-white/10 dark:bg-[#181818]
      "
    >
      <div className="aspect-square rounded-[14px] bg-[#e5e5e5] dark:bg-[#282828]" />
      <div className="mt-3 space-y-2">
        <div className="h-3 w-20 rounded-full bg-[#e5e5e5] dark:bg-[#282828]" />
        <div className="h-4 w-4/5 rounded-full bg-[#d4d4d8] dark:bg-[#343434]" />
        <div className="h-3 w-2/3 rounded-full bg-[#e4e4e7] dark:bg-[#2d2d2d]" />
        <div className="h-3 w-full rounded-full bg-[#f0f0f0] dark:bg-[#242424]" />
      </div>
    </div>
  );
};

export default ContentCardSkeleton;
