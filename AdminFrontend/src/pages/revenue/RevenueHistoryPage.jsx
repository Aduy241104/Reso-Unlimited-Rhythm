import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarRange,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";
import { routePaths } from "../../routes/routePaths";
import { getRevenuePeriodsService } from "../../services/revenueService";
import { DashboardCard, SectionHeader, StatusBadge } from "./components/RevenueShared";
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  getErrorMessage,
} from "./utils";

const PAGE_SIZE = 20;
const DEFAULT_META = {
  page: 1,
  total: 0,
  totalPages: 1,
};

const RevenueHistoryPage = () => {
  const [historyItems, setHistoryItems] = useState([]);
  const [pagination, setPagination] = useState(DEFAULT_META);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    const loadHistory = async () => {
      setIsLoading(true);
      setError("");

      try {
        const result = await getRevenuePeriodsService({
          page,
          limit: PAGE_SIZE,
        });

        if (!isActive) return;

        setHistoryItems(result.periods ?? []);
        setPagination(result.meta ?? DEFAULT_META);
      } catch (apiError) {
        if (!isActive) return;
        setError(getErrorMessage(apiError));
        setHistoryItems([]);
        setPagination(DEFAULT_META);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadHistory();

    return () => {
      isActive = false;
    };
  }, [page]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError("");

    try {
      const result = await getRevenuePeriodsService({
        page,
        limit: PAGE_SIZE,
      });

      setHistoryItems(result.periods ?? []);
      setPagination(result.meta ?? DEFAULT_META);
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setIsRefreshing(false);
    }
  };

  const currentPage = pagination?.page ?? page;
  const totalPages = pagination?.totalPages ?? 1;

  return (
    <section className="-mt-2 bg-[linear-gradient(180deg,#fdfdfe_0%,#f5f5f7_100%)] py-1">
      <div className="mx-auto max-w-7xl space-y-4">
        <DashboardCard className="border-violet-200/60 bg-[linear-gradient(135deg,#ffffff_0%,#fcfbff_58%,#f7f4ff_100%)] px-5 py-5 lg:px-6 lg:py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700">
                <CalendarRange size={14} />
                Lịch sử doanh thu
              </div>
              <h1 className="text-[1.9rem] font-semibold tracking-tight text-slate-950">
                Xem chi tiết doanh thu các tháng trước
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-600">
                Chỉ hiển thị các kỳ doanh thu backend đang trả về từ API, không
                dựng thêm tháng giả định từ phía giao diện.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={15}
                className={isRefreshing ? "animate-spin" : undefined}
              />
              Làm mới dữ liệu
            </button>
          </div>
        </DashboardCard>

        <DashboardCard>
          <SectionHeader
            eyebrow="History"
            title="Danh sách kỳ doanh thu từ API"
            description={`Trang ${currentPage} / ${totalPages}. Chỉ hiển thị các kỳ thực sự có trong dữ liệu backend.`}
          />

          {isLoading ? (
            <div className="flex min-h-[280px] items-center justify-center px-5 py-10 text-slate-500">
              <div className="flex items-center gap-3">
                <LoaderCircle size={22} className="animate-spin" />
                <span className="text-sm font-medium">Đang tải lịch sử doanh thu...</span>
              </div>
            </div>
          ) : error ? (
            <div className="px-5 py-5 text-sm text-rose-700">{error}</div>
          ) : historyItems.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <p className="text-sm font-medium text-slate-600">
                Backend hiện chưa trả về kỳ doanh thu nào để hiển thị.
              </p>
            </div>
          ) : (
            <div className="grid gap-px bg-violet-200/50">
              {historyItems.map((item) => (
                <div
                  key={item.id || `${item.year}-${item.month}`}
                  className="grid gap-4 bg-white px-5 py-5 lg:grid-cols-[1.15fr_0.7fr_0.8fr_0.8fr_0.6fr_auto] lg:items-center"
                >
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-slate-950">
                      {item.label || `${item.month}/${item.year}`}
                    </p>
                    <p className="text-sm text-slate-500">
                      Cập nhật:{" "}
                      {formatDateTime(
                        item.updatedAt ||
                          item.timestamps?.updatedAt ||
                          item.lifecycleTimestamps?.updatedAt ||
                          item.timestamps?.confirmedAt ||
                          item.lifecycleTimestamps?.confirmedAt
                      )}
                    </p>
                  </div>

                  <div>
                    <StatusBadge status={item.status || item.period?.status} />
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-500/70">
                      Premium
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {formatCurrency(item.summary?.premiumRevenue)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-500/70">
                      Quỹ nghệ sĩ
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {formatCurrency(item.summary?.artistPool)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-500/70">
                      Giao dịch
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {formatNumber(item.summary?.successfulTransactions)}
                    </p>
                  </div>

                  <div>
                    <Link
                      to={routePaths.revenuePeriodDetail(item.year, item.month)}
                      className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
                    >
                      Xem chi tiết
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>

        <div className="flex flex-col gap-3 rounded-2xl border border-violet-200/60 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Tổng cộng {formatNumber(pagination?.total)} kỳ doanh thu
          </p>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              disabled={currentPage <= 1 || isLoading}
              className="inline-flex items-center gap-2 rounded-full border border-violet-200 px-3.5 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowLeft size={15} />
              Trước
            </button>

            <span className="rounded-full bg-violet-50 px-3.5 py-2 text-sm font-semibold text-violet-700">
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.min(current + 1, totalPages))
              }
              disabled={currentPage >= totalPages || isLoading}
              className="inline-flex items-center gap-2 rounded-full border border-violet-200 px-3.5 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sau
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RevenueHistoryPage;
