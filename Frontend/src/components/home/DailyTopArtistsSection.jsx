import { ChevronRight, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { routePaths } from "../../routes/routePaths";
import { createPlaceholderImage } from "../../utils/artistProfile";

const FEATURED_ARTIST_COUNT = 3;

const getArtistAvatar = (artist) =>
  artist?.avatar || createPlaceholderImage(artist?.name || "Nghe Si", "#1db954", "#101828");

const featuredCardClassNameByRank = {
  1: "mt-0 sm:-translate-y-3",
  2: "mt-7",
  3: "mt-7",
};

const featuredAvatarClassNameByRank = {
  1: "h-36 w-36 ring-black/10 sm:h-48 sm:w-48 dark:ring-white/12",
  2: "h-24 w-24 ring-black/10 sm:h-32 sm:w-32 dark:ring-white/12",
  3: "h-24 w-24 ring-black/10 sm:h-32 sm:w-32 dark:ring-white/12",
};

const featuredRankBadgeClassNameByRank = {
  1: "bg-[#111111] text-white dark:bg-white dark:text-[#111111]",
  2: "bg-black/[0.06] text-[#111111] dark:bg-white/[0.08] dark:text-white",
  3: "bg-black/[0.06] text-[#111111] dark:bg-white/[0.08] dark:text-white",
};

const FeaturedArtistCard = ({ item }) => {
  const rank = Number(item?.rank) || 0;
  const isChampion = rank === 1;

  return (
    <Link
      to={ routePaths.artistBrowseProfile(item.artist.id) }
      className={ [
        `
          group relative flex min-w-0 flex-col items-center text-center transition duration-300
          hover:-translate-y-0.5
        `,
        featuredCardClassNameByRank[rank] || "mt-8",
      ].join(" ") }
    >
      <div
        className={ [
          `
            relative z-20 overflow-hidden rounded-full object-cover ring-4
            shadow-[0_12px_26px_rgba(15,23,42,0.12)]
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

      <div className="relative z-10 mt-4 flex flex-col items-center">
        <div
          className={ [
            "inline-flex items-center justify-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.22em]",
            featuredRankBadgeClassNameByRank[rank] || featuredRankBadgeClassNameByRank[3],
          ].join(" ") }
        >
          { isChampion ? <Crown className="mr-1.5 h-3.5 w-3.5" /> : null }
          #{ rank }
        </div>

        <p
          className={ [
            "mt-3 max-w-full truncate font-semibold leading-none tracking-tight text-[#111111] dark:text-white",
            isChampion
              ? "text-xl drop-shadow-[0_8px_20px_rgba(15,23,42,0.12)] sm:text-[1.9rem]"
              : "text-base sm:text-[1.35rem]",
          ].join(" ") }
        >
          { item.artist.name }
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
  title = "Top nghệ sĩ theo ngày",
  description = "Những nghệ sĩ được yêu thích nhất hôm nay.",
  items = [],
  isLoading = false,
  errorMessage = "",
  emptyMessage = "Hôm nay chưa có dữ liệu xếp hạng.",
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
            <div className="grid grid-cols-3 items-end gap-1.5 sm:gap-3">
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
                    <div
                      className={ [
                        "rounded-full border border-black/8 bg-black/[0.03] dark:border-white/[0.08] dark:bg-white/[0.04]",
                        isChampion ? "h-36 w-36 sm:h-48 sm:w-48" : "h-24 w-24 sm:h-32 sm:w-32",
                      ].join(" ") }
                    />
                    <div
                      className={ [
                        "mt-[-1.25rem] w-full rounded-[28px] border border-black/8 bg-black/[0.03] px-3 pb-4 pt-12 dark:border-white/[0.08] dark:bg-white/[0.04]",
                        isChampion ? "min-h-[12.5rem] sm:min-h-[14.5rem] sm:pt-16" : "min-h-[10.5rem] sm:min-h-[12rem] sm:pt-14",
                      ].join(" ") }
                    >
                      <div className="mx-auto h-7 w-16 rounded-full bg-black/8 dark:bg-white/10" />
                      <div
                        className={ [
                          "mx-auto mt-4 rounded-full bg-black/8 dark:bg-white/10",
                          isChampion ? "h-5 w-24 sm:h-7 sm:w-36" : "h-4 w-16 sm:h-5 sm:w-24",
                        ].join(" ") }
                      />
                      <div className="mx-auto mt-4 h-1.5 w-10 rounded-full bg-black/8 dark:bg-white/10" />
                    </div>
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
            <div className="grid grid-cols-3 items-end gap-1.5 sm:gap-3">
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
