import { ChevronRight, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { routePaths } from "../../routes/routePaths";
import { createPlaceholderImage } from "../../utils/artistProfile";

const FEATURED_ARTIST_COUNT = 3;

const getArtistAvatar = (artist) =>
  artist?.avatar || createPlaceholderImage(artist?.name || "Artist", "#1db954", "#101828");

const featuredCardClassNameByRank = {
  1: "mt-0 sm:-translate-y-2",
  2: "mt-8",
  3: "mt-8",
};

const featuredCardToneByRank = {
  1: `
    border-[#f59e0b]/30 bg-[linear-gradient(180deg,rgba(245,158,11,0.18),rgba(255,255,255,0.96))]
    shadow-[0_30px_70px_rgba(245,158,11,0.22)]
    dark:bg-[linear-gradient(180deg,rgba(245,158,11,0.22),rgba(24,24,27,0.96))]
  `,
  2: `
    border-[#38bdf8]/25 bg-[linear-gradient(180deg,rgba(56,189,248,0.14),rgba(255,255,255,0.96))]
    shadow-[0_24px_60px_rgba(56,189,248,0.16)]
    dark:bg-[linear-gradient(180deg,rgba(56,189,248,0.18),rgba(24,24,27,0.96))]
  `,
  3: `
    border-[#fb7185]/25 bg-[linear-gradient(180deg,rgba(251,113,133,0.14),rgba(255,255,255,0.96))]
    shadow-[0_24px_60px_rgba(251,113,133,0.16)]
    dark:bg-[linear-gradient(180deg,rgba(251,113,133,0.18),rgba(24,24,27,0.96))]
  `,
};

const featuredAvatarClassNameByRank = {
  1: "h-28 w-28 ring-[#f59e0b]/40 sm:h-40 sm:w-40",
  2: "h-20 w-20 ring-[#38bdf8]/32 sm:h-28 sm:w-28",
  3: "h-20 w-20 ring-[#fb7185]/32 sm:h-28 sm:w-28",
};

const featuredRankBadgeClassNameByRank = {
  1: "bg-[#f59e0b] text-[#111111]",
  2: "bg-[#38bdf8] text-[#082f49]",
  3: "bg-[#fb7185] text-[#4c0519]",
};

const FeaturedArtistCard = ({ item }) => {
  const rank = Number(item?.rank) || 0;
  const isChampion = rank === 1;

  return (
    <Link
      to={ routePaths.artistBrowseProfile(item.artist.id) }
      className={ [
        `
          group relative flex min-w-0 flex-col items-center overflow-hidden rounded-[28px]
          border px-3 pb-4 pt-4 text-center transition duration-300 hover:-translate-y-1
          dark:border-white/10 sm:px-4 sm:pb-5
        `,
        featuredCardClassNameByRank[rank] || "mt-8",
        featuredCardToneByRank[rank] || featuredCardToneByRank[3],
      ].join(" ") }
    >
      <div className="pointer-events-none absolute inset-x-6 top-0 h-24 rounded-full bg-white/55 blur-3xl dark:bg-white/10" />

      <div
        className={ [
          `
            relative z-10 inline-flex items-center justify-center rounded-full px-3 py-1
            text-xs font-semibold tracking-[0.22em]
          `,
          featuredRankBadgeClassNameByRank[rank] || featuredRankBadgeClassNameByRank[3],
        ].join(" ") }
      >
        { isChampion ? <Crown className="mr-1.5 h-3.5 w-3.5" /> : null }
        #{ rank }
      </div>

      <div
        className={ [
          `
            relative z-10 mt-4 overflow-hidden rounded-full object-cover ring-4
            shadow-[0_26px_60px_rgba(15,23,42,0.22)]
          `,
          featuredAvatarClassNameByRank[rank] || featuredAvatarClassNameByRank[3],
        ].join(" ") }
      >
        <img
          src={ getArtistAvatar(item.artist) }
          alt={ item.artist.name }
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.05]"
        />
      </div>

      <p
        className={ [
          "relative z-10 mt-4 max-w-full truncate font-semibold tracking-tight text-[#111111] dark:text-white",
          isChampion ? "text-lg sm:text-[1.65rem]" : "text-base sm:text-[1.35rem]",
        ].join(" ") }
      >
        { item.artist.name }
      </p>

      <div
        className={ [
          "relative z-10 mt-4 w-full rounded-[20px] px-3 py-2.5 text-center",
          isChampion
            ? "bg-black/[0.05] dark:bg-white/[0.07]"
            : "bg-black/[0.04] dark:bg-white/[0.05]",
        ].join(" ") }
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#52525b] dark:text-white/58">
          { isChampion ? "Leading today" : "Top artist" }
        </p>
        <p className="mt-1 text-sm font-medium text-[#111111] dark:text-white/90">
          Tap to view profile
        </p>
      </div>
    </Link>
  );
};

const RankingRow = ({ item }) => (
  <Link
    to={ routePaths.artistBrowseProfile(item.artist.id) }
    className="
      group grid grid-cols-[1.5rem_2rem_minmax(0,1fr)_0.875rem] items-center gap-2
      border-t border-black/6 px-0 py-2 transition hover:bg-black/[0.025]
      dark:border-white/[0.06] dark:hover:bg-white/[0.02]
      sm:grid-cols-[1.75rem_2.25rem_minmax(0,1fr)_1rem] sm:gap-2.5 sm:py-2.5
    "
  >
    <span className="text-base font-medium tracking-tight text-[#71717a] dark:text-white/68">
      { item.rank }
    </span>

    <img
      src={ getArtistAvatar(item.artist) }
      alt={ item.artist.name }
      className="h-7 w-7 rounded-full object-cover sm:h-8 sm:w-8"
    />

    <span className="truncate text-sm font-medium tracking-tight text-[#18181b] dark:text-white/90">
      { item.artist.name }
    </span>

    <ChevronRight className="h-3 w-3 justify-self-end text-[#71717a]/55 transition group-hover:translate-x-0.5 group-hover:text-[#18181b] dark:text-white/34 dark:group-hover:text-white/68 sm:h-3.5 sm:w-3.5" />
  </Link>
);

const DailyTopArtistsSection = ({
  title = "Daily Top Artists",
  description = "Most popular artists today.",
  items = [],
  isLoading = false,
  errorMessage = "",
  emptyMessage = "No ranking data available today.",
}) => {
  const featuredArtists = items.slice(0, FEATURED_ARTIST_COUNT);
  const rankingArtists = items.slice(FEATURED_ARTIST_COUNT);

  return (
    <section
      className="
        px-0 py-0
      "
    >
      <div className="space-y-6 sm:space-y-8">
        <div className="space-y-1.5">
          <h2 className="text-3xl font-semibold tracking-tight text-[#111111] dark:text-white sm:text-4xl">
            { title }
          </h2>
          <p className="text-sm text-[#52525b] dark:text-white/66 sm:text-lg">{ description }</p>
        </div>

        { errorMessage ? (
          <div className="rounded-[20px] border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            { errorMessage }
          </div>
        ) : isLoading ? (
          <div className="space-y-6 sm:space-y-8">
            <div className="grid grid-cols-3 items-end gap-3 sm:gap-6">
              { [2, 1, 3].map((rank) => {
                const isChampion = rank === 1;

                return (
                  <div
                    key={ rank }
                    className={ [
                      "flex animate-pulse flex-col items-center text-center",
                      rank === 1 ? "mt-0" : "mt-8",
                    ].join(" ") }
                  >
                    <div className="h-7 w-16 rounded-full bg-black/8 dark:bg-white/10" />
                    <div
                      className={ [
                        "mt-4 rounded-full border border-black/8 bg-black/[0.03] dark:border-white/[0.08] dark:bg-white/[0.04]",
                        isChampion ? "h-28 w-28 sm:h-40 sm:w-40" : "h-20 w-20 sm:h-28 sm:w-28",
                      ].join(" ") }
                    />
                    <div
                      className={ [
                        "mt-4 rounded-full bg-black/8 dark:bg-white/10",
                        isChampion ? "h-5 w-24 sm:h-7 sm:w-36" : "h-4 w-16 sm:h-5 sm:w-24",
                      ].join(" ") }
                    />
                    <div className="mt-4 h-12 w-full rounded-[18px] bg-black/[0.06] dark:bg-white/[0.08]" />
                  </div>
                );
              }) }
            </div>

            <div className="space-y-0">
              { Array.from({ length: Math.max(rankingArtists.length, 3) }).map((_, index) => (
                <div
                  key={ index }
                  className="
                    grid animate-pulse grid-cols-[1.5rem_2rem_minmax(0,1fr)_0.875rem] items-center gap-2
                    border-t border-black/6 py-2 dark:border-white/[0.06]
                    sm:grid-cols-[1.75rem_2.25rem_minmax(0,1fr)_1rem] sm:gap-2.5 sm:py-2.5
                  "
                >
                  <div className="h-4 w-4 rounded-full bg-black/8 dark:bg-white/10 sm:h-5 sm:w-5" />
                  <div className="h-7 w-7 rounded-full bg-black/8 dark:bg-white/10 sm:h-8 sm:w-8" />
                  <div className="h-3.5 w-16 rounded-full bg-black/8 dark:bg-white/10 sm:h-4 sm:w-24" />
                  <div className="h-3 w-3 justify-self-end rounded-full bg-black/8 dark:bg-white/10 sm:h-3.5 sm:w-3.5" />
                </div>
              )) }
            </div>
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-6 sm:space-y-8">
            <div className="grid grid-cols-3 items-end gap-3 sm:gap-6">
              { [featuredArtists[1], featuredArtists[0], featuredArtists[2]]
                .filter(Boolean)
                .map((item) => (
                  <FeaturedArtistCard key={ item.artist.id } item={ item } />
                )) }
            </div>

            { rankingArtists.length > 0 ? (
              <div className="space-y-0">
                { rankingArtists.map((item) => (
                  <RankingRow key={ item.artist.id } item={ item } />
                )) }
              </div>
            ) : null }
          </div>
        ) : (
          <div className="py-4 text-sm text-[#52525b] dark:text-white/62">{ emptyMessage }</div>
        ) }
      </div>
    </section>
  );
};

export default DailyTopArtistsSection;
