const skeletonRows = Array.from({ length: 5 }, (_, index) => index);

const ArtistFollowerSkeleton = () => {
  return (
    <div className="space-y-3">
      {skeletonRows.map((row) => (
        <div
          key={row}
          className="animate-pulse rounded-[20px] border border-[#ece8ff] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#181818] sm:p-5"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-[#ece8ff] dark:bg-white/[0.08]" />
              <div className="min-w-0 flex-1 space-y-3">
                <div className="h-3 w-24 rounded-full bg-[#efeaff] dark:bg-white/[0.08]" />
                <div className="h-5 w-52 max-w-full rounded-full bg-[#e7e1ff] dark:bg-white/[0.10]" />
                <div className="h-4 w-40 max-w-full rounded-full bg-[#f2efff] dark:bg-white/[0.06]" />
              </div>
            </div>

            <div className="h-8 w-28 rounded-full bg-[#f2efff] dark:bg-white/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default ArtistFollowerSkeleton;