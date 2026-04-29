const HomePage = () => {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
          Featured
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-900">
          Main Content
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        { [1, 2, 3].map((item) => (
          <article
            key={ item }
            className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <div className="aspect-square rounded-xl bg-zinc-100" />
            <h2 className="mt-4 text-base font-medium text-zinc-900">
              Playlist { item }
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Sample content for routed pages.
            </p>
          </article>
        )) }
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-medium text-zinc-900">
          Recently Played
        </h2>

        <div className="mt-4 space-y-3">
          { [1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={ item }
              className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 hover:bg-zinc-50 transition"
            >
              <span className="text-zinc-800">Song { item }</span>
              <span className="text-sm text-zinc-500">3:2{ item }</span>
            </div>
          )) }
        </div>
      </div>
    </section>
  );
};

export default HomePage;