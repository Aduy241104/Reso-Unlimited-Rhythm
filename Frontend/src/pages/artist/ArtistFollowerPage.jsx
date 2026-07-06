import { CalendarDays, RefreshCcw, TrendingUp, Users } from "lucide-react";
import { useEffect, useState } from "react";
import ArtistFollowerEmpty from "../../components/artistfollower/ArtistFollowerEmpty";
import ArtistFollowerList from "../../components/artistfollower/ArtistFollowerList";
import ArtistFollowerPagination from "../../components/artistfollower/ArtistFollowerPagination";
import ArtistFollowerSkeleton from "../../components/artistfollower/ArtistFollowerSkeleton";
import { getArtistFollowers } from "../../services/artistFollowservice";
import { getApiErrorMessage } from "../../utils/apiError";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const DEFAULT_PAGINATION = {
  page: DEFAULT_PAGE,
  limit: DEFAULT_LIMIT,
  totalItems: 0,
  totalPages: 0,
};

const CARD_STYLES =
  "rounded-[24px] border border-[#ebe6ff] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#181818] sm:p-6";

const normalizePagination = (pagination = {}, fallbackPage = DEFAULT_PAGE) => ({
  page: Number(pagination?.page || fallbackPage),
  limit: Number(pagination?.limit || DEFAULT_LIMIT),
  totalItems: Number(pagination?.totalItems || 0),
  totalPages: Number(pagination?.totalPages || 0),
});

const HO_CHI_MINH_TIMEZONE = "Asia/Ho_Chi_Minh";

const getCurrentDateParts = () => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: HO_CHI_MINH_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const dateParts = formatter.formatToParts(new Date());
  const year = dateParts.find((part) => part.type === "year")?.value;
  const month = dateParts.find((part) => part.type === "month")?.value;
  const day = dateParts.find((part) => part.type === "day")?.value;

  return {
    date: `${year}-${month}-${day}`,
    month: `${year}-${month}`,
  };
};

const getGrowthCountByField = (items = [], field, expectedValue) => {
  if (!Array.isArray(items) || items.length === 0 || !field || !expectedValue) {
    return 0;
  }

  const matchedItem = items.find((item) => item?.[field] === expectedValue);

  return Number(matchedItem?.count || 0);
};

const SummaryCard = ({ icon: Icon, label, value, helper, isLoading = false }) => {
  return (
    <div className="rounded-[20px] border border-[#efeaff] bg-white/80 p-4 backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[#7c7891] dark:text-[#a1a1aa]">{label}</p>
          {isLoading ? (
            <div className="mt-3 h-8 w-20 animate-pulse rounded-full bg-[#ece6ff] dark:bg-white/[0.08]" />
          ) : (
            <p className="mt-2 text-2xl font-semibold text-[#2f2747] dark:text-white">
              {value}
            </p>
          )}
          <p className="mt-2 text-xs leading-5 text-[#8a84a2] dark:text-[#8f8f98]">{helper}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f3efff] text-[#6f5cf1] dark:bg-white/[0.06] dark:text-[#d2cbff]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

const ArtistFollowerPage = () => {
  const [artist, setArtist] = useState(null);
  const [followers, setFollowers] = useState([]);
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [latestDailyGrowth, setLatestDailyGrowth] = useState(0);
  const [latestMonthlyGrowth, setLatestMonthlyGrowth] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchFollowers = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const payload = await getArtistFollowers({
          page,
          limit: DEFAULT_LIMIT,
        });

        if (!isMounted) {
          return;
        }

        const followersPayload = payload?.followers || {};
        const statisticsPayload = payload?.statistics || {};
        const nextFollowers = Array.isArray(followersPayload?.items)
          ? followersPayload.items
          : [];
        const nextPagination = normalizePagination(
          followersPayload?.pagination || DEFAULT_PAGINATION,
          page
        );
        const currentDateParts = getCurrentDateParts();

        setArtist(payload?.artist || null);
        setFollowers(nextFollowers);
        setPagination(nextPagination);
        setLatestDailyGrowth(
          getGrowthCountByField(
            statisticsPayload?.dailyGrowth || [],
            "date",
            currentDateParts.date
          )
        );
        setLatestMonthlyGrowth(
          getGrowthCountByField(
            statisticsPayload?.monthlyGrowth || [],
            "month",
            currentDateParts.month
          )
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setArtist(null);
        setFollowers([]);
        setPagination({
          ...DEFAULT_PAGINATION,
          page,
        });
        setLatestDailyGrowth(0);
        setLatestMonthlyGrowth(0);
        setErrorMessage(
          getApiErrorMessage(error, "Không thể tải dữ liệu người theo dõi.")
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchFollowers();

    return () => {
      isMounted = false;
    };
  }, [page, reloadKey]);

  const totalPages = Number(pagination?.totalPages) || 0;
  const totalItems = Number(pagination?.totalItems) || 0;
  const limit = Number(pagination?.limit) || DEFAULT_LIMIT;

  const handlePreviousPage = () => {
    setPage((currentPage) => {
      if (currentPage <= 1) {
        return currentPage;
      }

      return currentPage - 1;
    });
  };

  const handleNextPage = () => {
    setPage((currentPage) => {
      const nextTotalPages = Number(pagination?.totalPages) || 1;

      if (currentPage >= nextTotalPages) {
        return currentPage;
      }

      return currentPage + 1;
    });
  };

  const refreshFollowers = () => {
    setReloadKey((currentKey) => currentKey + 1);
  };

  return (
    <section className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-[#ebe6ff] bg-white shadow-[0_24px_60px_-36px_rgba(70,42,135,0.35)] dark:border-white/10 dark:bg-[#181818] dark:shadow-none">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(124,108,242,0.18),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(140,112,240,0.12),_transparent_35%),linear-gradient(135deg,#ffffff_0%,#fcfbff_56%,#f7f4ff_100%)] px-5 py-6 dark:bg-[radial-gradient(circle_at_top_left,_rgba(124,108,242,0.22),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(140,112,240,0.18),_transparent_35%),linear-gradient(135deg,#181818_0%,#1b1b1f_56%,#17171a_100%)] sm:px-7 sm:py-7">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6f5cf1] dark:text-[#c4bbff]">
                ARTIST FOLLOWERS
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#241b15] dark:text-white">
                Người theo dõi
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6a647d] dark:text-[#a1a1aa]">
                {artist?.name
                  ? `Nghệ sĩ: ${artist.name}`
                  : "Theo dõi danh sách follower mới nhất của nghệ sĩ của bạn."}
              </p>
            </div>

            <button
              type="button"
              onClick={refreshFollowers}
              disabled={isLoading}
              className="inline-flex items-center gap-2 self-start rounded-2xl border border-[#e7e1ff] bg-white px-4 py-3 text-sm font-medium text-[#2f2747] shadow-sm transition hover:border-[#cbbfff] hover:bg-[#faf8ff] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]"
            >
              <RefreshCcw className={["h-4 w-4", isLoading ? "animate-spin" : ""].join(" ")} />
              Tải lại dữ liệu
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <SummaryCard
              icon={Users}
              label="Tổng người theo dõi"
              value={totalItems}
              helper="Tổng số tài khoản đang theo dõi nghệ sĩ của bạn."
              isLoading={isLoading}
            />
            <SummaryCard
              icon={TrendingUp}
              label="Tăng hôm nay"
              value={latestDailyGrowth}
              helper="Số follower mới ghi nhận ở mốc ngày gần nhất."
              isLoading={isLoading}
            />
            <SummaryCard
              icon={CalendarDays}
              label="Tăng tháng này"
              value={latestMonthlyGrowth}
              helper="Số follower mới ghi nhận ở mốc tháng gần nhất."
              isLoading={isLoading}
            />
          </div>
        </div>
      </section>

      {errorMessage ? (
        <section className="rounded-[24px] border border-rose-200 bg-rose-50 p-6 shadow-sm dark:border-rose-400/20 dark:bg-rose-500/10">
          <p className="text-base font-semibold text-rose-900 dark:text-rose-100">
            Không thể tải dữ liệu người theo dõi
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-rose-700 dark:text-rose-200/90">
            {errorMessage}
          </p>
          <button
            type="button"
            onClick={refreshFollowers}
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#6f5cf1] px-5 text-sm font-semibold text-white transition hover:bg-[#5f4fe0]"
          >
            <RefreshCcw className="h-4 w-4" />
            Thử lại
          </button>
        </section>
      ) : null}

      <section className={CARD_STYLES}>
        <div className="mb-5 flex flex-col gap-3 border-b border-[#f0ebff] pb-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-medium text-[#6f5cf1] dark:text-[#c4bbff]">
              <Users className="h-4 w-4" />
              Danh sách follower
            </div>
            <p className="mt-2 text-sm text-[#7b7494] dark:text-[#a1a1aa]">
              Hiển thị tối đa {limit} người theo dõi trên mỗi trang.
            </p>
          </div>
        </div>

        {isLoading ? (
          <ArtistFollowerSkeleton />
        ) : followers.length === 0 ? (
          <ArtistFollowerEmpty />
        ) : (
          <ArtistFollowerList followers={followers} />
        )}
      </section>

      {!isLoading && !errorMessage ? (
        <ArtistFollowerPagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          limit={limit}
          onPreviousPage={handlePreviousPage}
          onNextPage={handleNextPage}
        />
      ) : null}
    </section>
  );
};

export default ArtistFollowerPage;
