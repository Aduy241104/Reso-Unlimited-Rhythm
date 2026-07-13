const chartSkeletons = Array.from({ length: 2 }, (_, index) => index);
const listSkeletons = Array.from({ length: 4 }, (_, index) => index);

const ArtistFollowerSkeleton = () => {
  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-2">
        {chartSkeletons.map((item) => (
          <div
            key={item}
            className="animate-pulse rounded-[24px] border border-[#ebe6ff] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#181818] sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <div className="h-4 w-36 rounded-full bg-[#ece8ff] dark:bg-white/[0.08]" />
                <div className="h-4 w-64 max-w-full rounded-full bg-[#f1edff] dark:bg-white/[0.06]" />
              </div>
              <div className="h-16 w-20 rounded-2xl bg-[#f1edff] dark:bg-white/[0.06]" />
            </div>
            <div className="mt-5 h-[280px] rounded-[20px] bg-[#faf8ff] dark:bg-white/[0.04]" />
          </div>
        ))}
      </section>

      <section className="rounded-[24px] border border-[#ebe6ff] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#181818] sm:p-6">
        <div className="mb-5 animate-pulse space-y-3 border-b border-[#f0ebff] pb-4 dark:border-white/10">
          <div className="h-4 w-36 rounded-full bg-[#ece8ff] dark:bg-white/[0.08]" />
          <div className="h-4 w-56 rounded-full bg-[#f1edff] dark:bg-white/[0.06]" />
        </div>

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
      </section>
    </div>
  );
};

export default ArtistFollowerSkeleton;
