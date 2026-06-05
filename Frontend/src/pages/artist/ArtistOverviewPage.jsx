const stats = [
  {
    label: "Total Streams",
    value: "128.4M",
    detail: "+8.2% from last month",
  },
  {
    label: "Followers",
    value: "342.8K",
    detail: "+4,320 this week",
  },
  {
    label: "Monthly Listeners",
    value: "2.94M",
    detail: "Across all platforms",
  },
  {
    label: "Revenue",
    value: "$84,920",
    detail: "Estimated this month",
  },
];

const recentReleases = [
  {
    id: "01",
    release: "Midnight Echoes",
    type: "Album",
    streams: "22.4M",
    listeners: "1.2M",
    date: "Apr 18, 2026",
    status: "Live",
  },
  {
    id: "02",
    release: "Velvet Season",
    type: "Single",
    streams: "8.7M",
    listeners: "604K",
    date: "Mar 05, 2026",
    status: "Promoting",
  },
  {
    id: "03",
    release: "Afterglow Sessions",
    type: "EP",
    streams: "12.1M",
    listeners: "771K",
    date: "Jan 27, 2026",
    status: "Live",
  },
  {
    id: "04",
    release: "Northbound",
    type: "Single",
    streams: "4.9M",
    listeners: "318K",
    date: "Dec 12, 2025",
    status: "Draft",
  },
];

const topSongs = [
  { title: "Golden Static", streams: "11.4M" },
  { title: "Paper Moonlight", streams: "9.8M" },
  { title: "Downtown Reverie", streams: "8.2M" },
  { title: "Signal Fires", streams: "7.6M" },
  { title: "Slow Cinema", streams: "6.9M" },
];

const chartBars = [
  { month: "Jan", height: "h-16" },
  { month: "Feb", height: "h-24" },
  { month: "Mar", height: "h-20" },
  { month: "Apr", height: "h-32" },
  { month: "May", height: "h-28" },
  { month: "Jun", height: "h-36" },
  { month: "Jul", height: "h-24" },
];

const statusClasses = {
  Live: "bg-[#f3ebe3] text-[#6f4a2c]",
  Promoting: "bg-[#f7f1e8] text-[#8b5e3c]",
  Draft: "bg-neutral-100 text-neutral-600",
};

const ArtistOverviewPage = () => {
  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-md border border-neutral-200 bg-white p-5"
          >
            <p className="text-sm font-medium text-neutral-500">{stat.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-[#241b15]">
              {stat.value}
            </p>
            <p className="mt-2 text-sm text-[#8b5e3c]">{stat.detail}</p>
          </article>
        ))}
      </div>

      <section className="rounded-md border border-neutral-200 bg-white">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[#241b15]">
              Recent Releases
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              A quick view of your latest published and upcoming projects.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 text-left text-sm">
            <thead className="bg-[#fcfaf7] text-neutral-500">
              <tr>
                <th className="px-5 py-3 font-medium">#</th>
                <th className="px-5 py-3 font-medium">Release</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Streams</th>
                <th className="px-5 py-3 font-medium">Listeners</th>
                <th className="px-5 py-3 font-medium">Release Date</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-200">
              {recentReleases.map((release) => (
                <tr key={release.id} className="text-[#2f261f]">
                  <td className="px-5 py-4 text-neutral-500">{release.id}</td>
                  <td className="px-5 py-4 font-medium">{release.release}</td>
                  <td className="px-5 py-4">{release.type}</td>
                  <td className="px-5 py-4">{release.streams}</td>
                  <td className="px-5 py-4">{release.listeners}</td>
                  <td className="px-5 py-4">{release.date}</td>
                  <td className="px-5 py-4">
                    <span
                      className={[
                        "inline-flex rounded-sm px-2.5 py-1 text-xs font-medium",
                        statusClasses[release.status],
                      ].join(" ")}
                    >
                      {release.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className="rounded-md border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#241b15]">Top Songs</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Best-performing tracks this month.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {topSongs.map((song, index) => (
              <div
                key={song.title}
                className="flex items-center justify-between rounded-sm border border-neutral-200 px-4 py-3"
              >
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-neutral-400">
                    0{index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-[#2f261f]">{song.title}</p>
                    <p className="text-sm text-neutral-500">Streaming catalog</p>
                  </div>
                </div>

                <p className="text-sm font-medium text-[#8b5e3c]">
                  {song.streams}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-neutral-200 bg-white p-5">
          <div>
            <h2 className="text-lg font-semibold text-[#241b15]">
              Stream Analytics
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Placeholder for trend and performance visualizations.
            </p>
          </div>

          <div className="mt-8 rounded-md border border-neutral-200 bg-[#fcfaf7] p-5">
            <div className="flex h-64 items-end justify-between gap-3">
              {chartBars.map((bar) => (
                <div key={bar.month} className="flex flex-1 flex-col items-center">
                  <div className="flex h-40 items-end">
                    <div
                      className={[
                        "w-9 rounded-sm bg-[#8b5e3c]",
                        bar.height,
                      ].join(" ")}
                    />
                  </div>
                  <span className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
                    {bar.month}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </section>
  );
};

export default ArtistOverviewPage;
