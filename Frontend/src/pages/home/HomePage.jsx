import { useTheme } from "../../hooks/useTheme";

const HomePage = () => {
  const { isDark } = useTheme();

  return (
    <section className="space-y-5 sm:space-y-6">
      <div>
        <p
          className={[
            "text-sm uppercase tracking-[0.3em]",
            isDark ? "text-[#b8b0aa]" : "text-[#6b7280]",
          ].join(" ")}
        >
          Featured
        </p>
        <h1
          className={[
            "mt-2 text-2xl font-semibold sm:text-3xl",
            isDark ? "text-[#f7f1ea]" : "text-[#111111]",
          ].join(" ")}
        >
          Main Content
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        { [1, 2, 3].map((item) => (
          <article
            key={ item }
            className={[
              "rounded-2xl border p-4 transition",
              isDark
                ? "border-[#f5b66f]/10 bg-[#1c1820] hover:bg-[#241f28]"
                : "border-[#ececec] bg-white shadow-[0_12px_32px_rgba(15,23,42,0.05)] hover:bg-[#fafafa]",
            ].join(" ")}
          >
            <div
              className={[
                "aspect-square rounded-xl bg-gradient-to-br",
                isDark
                  ? "from-[#2a1e19] via-[#1c1820] to-[#16141a]"
                  : "from-[#ffffff] via-[#f5f5f5] to-[#e5e7eb]",
              ].join(" ")}
            />
            <h2
              className={[
                "mt-4 text-base font-medium",
                isDark ? "text-[#f7f1ea]" : "text-[#111111]",
              ].join(" ")}
            >
              Playlist { item }
            </h2>
            <p
              className={[
                "mt-1 text-sm",
                isDark ? "text-[#b8b0aa]" : "text-[#6b7280]",
              ].join(" ")}
            >
              Sample content for routed pages.
            </p>
          </article>
        )) }
      </div>

      <div
        className={[
          "rounded-2xl border p-4",
          isDark
            ? "border-[#f5b66f]/10 bg-[#1c1820]"
            : "border-[#ececec] bg-white shadow-[0_12px_32px_rgba(15,23,42,0.05)]",
        ].join(" ")}
      >
        <h2
          className={[
            "text-lg font-medium",
            isDark ? "text-[#f7f1ea]" : "text-[#111111]",
          ].join(" ")}
        >
          Recently Played
        </h2>

        <div className="mt-4 space-y-3">
          { [1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={ item }
              className={[
                "flex items-center justify-between rounded-xl border px-4 py-3 transition",
                isDark
                  ? "border-[#f5b66f]/10 bg-[#1c1820] hover:bg-[#241f28]"
                  : "border-[#f1f1f1] bg-white hover:bg-[#fafafa]",
              ].join(" ")}
            >
              <span className={ isDark ? "text-[#f7f1ea]" : "text-[#111111]" }>Song { item }</span>
              <span
                className={[
                  "text-sm",
                  isDark ? "text-[#b8b0aa]" : "text-[#6b7280]",
                ].join(" ")}
              >
                3:2{ item }
              </span>
            </div>
          )) }
        </div>
      </div>
    </section>
  );
};

export default HomePage;
