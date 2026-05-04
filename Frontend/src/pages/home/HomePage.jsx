const HomePage = () => {
  return (
    <section className="space-y-5 sm:space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-[#b8b0aa]">
          Featured
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[#f7f1ea] sm:text-3xl">
          Main Content
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        { [1, 2, 3].map((item) => (
          <article
            key={ item }
            className="rounded-2xl border border-[#f5b66f]/10 bg-[#1c1820] p-4 transition hover:bg-[#241f28]"
          >
            <div className="aspect-square rounded-xl bg-gradient-to-br from-[#2a1e19] via-[#1c1820] to-[#16141a]" />
            <h2 className="mt-4 text-base font-medium text-[#f7f1ea]">
              Playlist { item }
            </h2>
            <p className="mt-1 text-sm text-[#b8b0aa]">
              Sample content for routed pages.
            </p>
          </article>
        )) }
      </div>

      <div className="rounded-2xl border border-[#f5b66f]/10 bg-[#1c1820] p-4">
        <h2 className="text-lg font-medium text-[#f7f1ea]">
          Recently Played
        </h2>

        <div className="mt-4 space-y-3">
          { [1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={ item }
              className="flex items-center justify-between rounded-xl border border-[#f5b66f]/10 bg-[#1c1820] px-4 py-3 transition hover:bg-[#241f28]"
            >
              <span className="text-[#f7f1ea]">Song { item }</span>
              <span className="text-sm text-[#b8b0aa]">3:2{ item }</span>
            </div>
          )) }
        </div>
      </div>
    </section>
  );
};

export default HomePage;
