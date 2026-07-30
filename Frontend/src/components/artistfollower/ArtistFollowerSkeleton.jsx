const chartSkeletonPoints = Array.from({ length: 7 }, (_, index) => index);
const listSkeletons = Array.from({ length: 4 }, (_, index) => index);

export const ArtistFollowerChartSkeleton = () => {
  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="h-4 w-32 rounded-full bg-[#ece8ff] dark:bg-white/[0.08]" />
          <div className="h-7 w-56 max-w-full rounded-full bg-[#f1edff] dark:bg-white/[0.06]" />
          <div className="h-4 w-72 max-w-full rounded-full bg-[#ece8ff] dark:bg-white/[0.08]" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[280px]">
          <div className="rounded-[18px] border border-[#ebe6ff] bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="h-3 w-20 rounded-full bg-[#ece8ff] dark:bg-white/[0.08]" />
            <div className="mt-3 h-7 w-16 rounded-full bg-[#f1edff] dark:bg-white/[0.06]" />
            <div className="mt-2 h-3 w-20 rounded-full bg-[#ece8ff] dark:bg-white/[0.08]" />
          </div>
          <div className="rounded-[18px] border border-[#ebe6ff] bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="h-3 w-24 rounded-full bg-[#ece8ff] dark:bg-white/[0.08]" />
            <div className="mt-3 h-7 w-16 rounded-full bg-[#f1edff] dark:bg-white/[0.06]" />
            <div className="mt-2 h-3 w-20 rounded-full bg-[#ece8ff] dark:bg-white/[0.08]" />
          </div>
        </div>
      </div>

      <div className="mt-4 animate-pulse rounded-[16px] border border-[#e7e1ff] bg-[#f8f6ff] p-3.5 dark:border-white/10 dark:bg-white/[0.03] sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <div className="h-4 w-32 rounded-full bg-[#ece8ff] dark:bg-white/[0.08]" />
            <div className="h-4 w-48 rounded-full bg-[#f1edff] dark:bg-white/[0.06]" />
          </div>
          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <div className="h-3 w-20 rounded-full bg-[#ece8ff] dark:bg-white/[0.08]" />
              <div className="h-4 w-14 rounded-full bg-[#f1edff] dark:bg-white/[0.06]" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-20 rounded-full bg-[#ece8ff] dark:bg-white/[0.08]" />
              <div className="h-4 w-14 rounded-full bg-[#f1edff] dark:bg-white/[0.06]" />
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-[20px] bg-white p-3 dark:bg-[#181818]">
          <div className="overflow-hidden rounded-[16px]">
            <div className="relative h-[320px] min-h-[320px] w-full min-w-[560px]">
              {[0, 1, 2, 3].map((line) => (
                <div
                  key={line}
                  className="absolute left-0 right-0 border-t border-dashed border-[#ece6ff] dark:border-white/10"
                  style={{ top: `${line * 25}%` }}
                />
              ))}

              <div className="absolute inset-x-6 bottom-7 top-5 flex items-end justify-between gap-6">
                {chartSkeletonPoints.map((point, index) => (
                  <div
                    key={point}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-3"
                  >
                    <div
                      className="w-full rounded-full bg-[#d9cffd] dark:bg-white/[0.10]"
                      style={{ height: `${2 + (index % 2)}px` }}
                    />
                    <div className="h-4 w-4 rounded-full border-2 border-[#d9cffd] bg-white dark:border-white/[0.14] dark:bg-[#181818]" />
                    <div className="h-4 w-10 rounded-full bg-[#ece8ff] dark:bg-white/[0.08]" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ArtistFollowerSkeleton = () => {
  return (
    <div className="space-y-3">
      {listSkeletons.map((row) => (
        <div
          key={row}
          className="animate-pulse rounded-[20px] border border-[#ece8ff] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#181818] sm:p-5"
        >
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-[#ece8ff] dark:bg-white/[0.08]" />
            <div className="min-w-0 flex-1 space-y-3">
              <div className="h-5 w-44 max-w-full rounded-full bg-[#e7e1ff] dark:bg-white/[0.10]" />
              <div className="h-4 w-40 max-w-full rounded-full bg-[#f2efff] dark:bg-white/[0.06]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ArtistFollowerSkeleton;