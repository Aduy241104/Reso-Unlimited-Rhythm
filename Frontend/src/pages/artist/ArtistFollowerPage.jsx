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
const DAILY_GROWTH_DAYS = 7;

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

const createUtcDateFromIso = (value) => {
  const [year, month, day] = String(value || "")
    .split("-")
    .map((part) => Number(part));

  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  return Number.isNaN(date.getTime()) ? null : date;
};

const formatUtcDateToIso = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatGrowthLabel = (value) => {
  const date = createUtcDateFromIso(value);

  if (!date) {
    return "--/--";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
};

const buildDailyGrowthChartData = (items = [], endDate) => {
  const endDateUtc = createUtcDateFromIso(endDate);
  const growthMap = new Map(
    (Array.isArray(items) ? items : []).map((item) => [
      item?.date,
      Number(item?.count || 0),
    ])
  );

  if (!endDateUtc) {
    return [];
  }

  return Array.from({ length: DAILY_GROWTH_DAYS }, (_, index) => {
    const date = new Date(endDateUtc);
    date.setUTCDate(endDateUtc.getUTCDate() - (DAILY_GROWTH_DAYS - index - 1));

    const isoDate = formatUtcDateToIso(date);

    return {
      date: isoDate,
      label: formatGrowthLabel(isoDate),
      count: growthMap.get(isoDate) || 0,
    };
  });
};

const formatMetricValue = (value) => Number(value || 0).toLocaleString("vi-VN");

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

const DailyGrowthChart = ({ data = [], isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="animate-pulse rounded-[22px] border border-[#f0ebff] bg-[#fcfbff] p-4 dark:border-white/10 dark:bg-white/[0.03] sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="h-4 w-40 rounded-full bg-[#ece8ff] dark:bg-white/[0.08]" />
            <div className="h-4 w-64 max-w-full rounded-full bg-[#f1edff] dark:bg-white/[0.06]" />
          </div>
          <div className="h-14 w-24 rounded-2xl bg-[#f1edff] dark:bg-white/[0.06]" />
        </div>
        <div className="mt-6 flex h-56 items-end gap-3">
          {Array.from({ length: DAILY_GROWTH_DAYS }, (_, index) => (
            <div key={index} className="flex flex-1 flex-col items-center justify-end gap-3">
              <div className="h-4 w-8 rounded-full bg-[#ece8ff] dark:bg-white/[0.08]" />
              <div
                className="w-full rounded-t-[16px] bg-[#e8e1ff] dark:bg-white/[0.08]"
                style={{ height: `${28 + index * 10}px` }}
              />
              <div className="h-4 w-10 rounded-full bg-[#f1edff] dark:bg-white/[0.06]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const safeData = Array.isArray(data) ? data : [];
  const totalGrowth = safeData.reduce((sum, item) => sum + Number(item?.count || 0), 0);
  const peakDay = safeData.reduce(
    (currentPeak, item) =>
      Number(item?.count || 0) > Number(currentPeak?.count || 0) ? item : currentPeak,
    safeData[0] || null
  );
  const maxCount = Math.max(...safeData.map((item) => Number(item?.count || 0)), 0);

  return (
    <div className="rounded-[22px] border border-[#f0ebff] bg-[#fcfbff] p-4 dark:border-white/10 dark:bg-white/[0.03] sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#f2edff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#6f5cf1] dark:bg-white/[0.06] dark:text-[#c4bbff]">
            <TrendingUp className="h-3.5 w-3.5" />
            7 ngày gần nhất
          </div>
          <h2 className="mt-3 text-lg font-semibold text-[#2f2747] dark:text-white">
            Biểu đồ tăng trưởng follower
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#7b7494] dark:text-[#a1a1aa]">
            Dữ liệu theo ngày được lấy từ thống kê hiện có và tự động bù các ngày chưa phát sinh follower mới.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[280px]">
          <div className="rounded-[18px] border border-[#ebe6ff] bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-xs uppercase tracking-[0.16em] text-[#8a84a2] dark:text-[#8f8f98]">
              Tổng 7 ngày
            </p>
            <p className="mt-2 text-xl font-semibold text-[#2f2747] dark:text-white">
              {formatMetricValue(totalGrowth)}
            </p>
          </div>
          <div className="rounded-[18px] border border-[#ebe6ff] bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-xs uppercase tracking-[0.16em] text-[#8a84a2] dark:text-[#8f8f98]">
              Cao nhất
            </p>
            <p className="mt-2 text-xl font-semibold text-[#2f2747] dark:text-white">
              {formatMetricValue(peakDay?.count || 0)}
            </p>
            <p className="mt-1 text-xs text-[#8a84a2] dark:text-[#8f8f98]">
              {peakDay?.label ? `Ngày ${peakDay.label}` : "Chưa có dữ liệu"}
            </p>
          </div>
        </div>
      </div>

      <div className="relative mt-6 overflow-hidden rounded-[20px] border border-[#ebe6ff] bg-white px-4 pb-4 pt-5 dark:border-white/10 dark:bg-[#181818] sm:px-5">
        <div className="pointer-events-none absolute inset-x-4 bottom-[52px] top-5 sm:inset-x-5">
          {[0, 1, 2, 3].map((line) => (
            <div
              key={line}
              className="absolute left-0 right-0 border-t border-dashed border-[#ece6ff] dark:border-white/10"
              style={{ bottom: `${(line / 3) * 100}%` }}
            />
          ))}
        </div>

        <div className="relative flex h-64 items-end gap-3 sm:gap-4">
          {safeData.map((item) => {
            const count = Number(item?.count || 0);
            const barHeight =
              count > 0 && maxCount > 0
                ? `${Math.max((count / maxCount) * 100, 12)}%`
                : "6px";

            return (
              <div
                key={item?.date || item?.label}
                className="flex min-w-0 flex-1 flex-col items-center justify-end gap-3"
              >
                <span className="text-xs font-semibold text-[#6f5cf1] dark:text-[#d2cbff]">
                  {formatMetricValue(count)}
                </span>
                <div className="flex h-44 w-full items-end">
                  <div
                    className="w-full rounded-t-[16px] bg-[linear-gradient(180deg,#9b8cff_0%,#6f5cf1_100%)] shadow-[0_12px_30px_-20px_rgba(111,92,241,0.95)] transition-[height,opacity] duration-500 dark:bg-[linear-gradient(180deg,#cfc6ff_0%,#8b7cff_100%)]"
                    style={{
                      height: barHeight,
                      opacity: count > 0 ? 1 : 0.45,
                    }}
                  />
                </div>
                <span className="text-xs font-medium text-[#7b7494] dark:text-[#a1a1aa]">
                  {item?.label || "--/--"}
                </span>
              </div>
            );
          })}
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
  const [dailyGrowthChart, setDailyGrowthChart] = useState(() =>
    buildDailyGrowthChartData([], getCurrentDateParts().date)
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchFollowers = async () => {
      const currentDateParts = getCurrentDateParts();

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
        setDailyGrowthChart(
          buildDailyGrowthChartData(
            statisticsPayload?.dailyGrowth || [],
            currentDateParts.date
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
        setDailyGrowthChart(buildDailyGrowthChartData([], currentDateParts.date));
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

      {!errorMessage ? (
        <section className={CARD_STYLES}>
          <DailyGrowthChart data={dailyGrowthChart} isLoading={isLoading} />
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
