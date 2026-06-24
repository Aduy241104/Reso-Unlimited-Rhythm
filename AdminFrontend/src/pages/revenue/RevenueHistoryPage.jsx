import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarRange,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";
import { routePaths } from "../../routes/routePaths";
import { getRevenuePeriodsService } from "../../services/revenueService";
import { DashboardCard, StatusBadge } from "./components/RevenueShared";
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
    <section className="-mt-2 bg-slate-50 py-4 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-4 px-4 lg:px-0">
        <DashboardCard className="border-slate-200 bg-white">
          <div className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[12px] font-medium text-slate-500">
                <CalendarRange size={ 15 } />
                <span>Lịch sử doanh thu</span>
              </div>

              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Doanh thu các kỳ trước
              </h1>

              <p className="mt-1 max-w-2xl text-[13px] leading-6 text-slate-500">
                Theo dõi các kỳ doanh thu đã ghi nhận, trạng thái xử lý và số
                liệu phân bổ chính.
              </p>
            </div>

            <button
              type="button"
              onClick={ () => void handleRefresh() }
              disabled={ isRefreshing }
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={ 15 }
                className={ isRefreshing ? "animate-spin" : undefined }
              />
              Làm mới
            </button>
          </div>
        </DashboardCard>

        { error ? (
          <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
            <AlertCircle size={ 17 } className="mt-0.5 shrink-0" />
            <p className="text-[13px] leading-6">{ error }</p>
          </div>
        ) : null }

        <DashboardCard className="overflow-hidden border-slate-200 bg-white">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                Danh sách kỳ doanh thu
              </h2>
              <p className="mt-1 text-[13px] text-slate-500">
                Trang { currentPage } / { totalPages }
              </p>
            </div>

            <p className="text-[13px] text-slate-500">
              { PAGE_SIZE } bản ghi mỗi trang
            </p>
          </div>

          { isLoading ? (
            <div className="flex min-h-[280px] items-center justify-center px-5 py-10 text-slate-500">
              <div className="flex items-center gap-3">
                <LoaderCircle size={ 20 } className="animate-spin" />
                <span className="text-[13px] font-medium">
                  Đang tải lịch sử doanh thu...
                </span>
              </div>
            </div>
          ) : historyItems.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <p className="text-[13px] font-medium text-slate-600">
                Chưa có kỳ doanh thu nào để hiển thị.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[13px]">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-[0.08em] text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Kỳ</th>
                    <th className="px-5 py-3 font-semibold">Trạng thái</th>
                    <th className="px-5 py-3 font-semibold">Premium</th>
                    <th className="px-5 py-3 font-semibold">Quỹ nghệ sĩ</th>
                    <th className="px-5 py-3 font-semibold">Giao dịch</th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Thao tác
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  { historyItems.map((item) => (
                    <tr
                      key={ item.id || `${item.year}-${item.month}` }
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 align-middle">
                        <p className="font-semibold text-slate-950">
                          { item.label || `${item.month}/${item.year}` }
                        </p>

                        <p className="mt-1 text-[12px] text-slate-500">
                          Cập nhật:{ " " }
                          { formatDateTime(
                            item.updatedAt ||
                            item.timestamps?.updatedAt ||
                            item.lifecycleTimestamps?.updatedAt ||
                            item.timestamps?.confirmedAt ||
                            item.lifecycleTimestamps?.confirmedAt
                          ) }
                        </p>
                      </td>

                      <td className="px-5 py-4 align-middle">
                        <StatusBadge status={ item.status || item.period?.status } />
                      </td>

                      <td className="px-5 py-4 align-middle font-medium text-slate-900">
                        { formatCurrency(item.summary?.premiumRevenue) }
                      </td>

                      <td className="px-5 py-4 align-middle font-medium text-slate-900">
                        { formatCurrency(item.summary?.artistPool) }
                      </td>

                      <td className="px-5 py-4 align-middle font-medium text-slate-900">
                        { formatNumber(item.summary?.successfulTransactions) }
                      </td>

                      <td className="px-5 py-4 text-right align-middle">
                        <Link
                          to={ routePaths.revenuePeriodDetail(item.id) }
                          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          Chi tiết
                          <ArrowRight size={ 14 } />
                        </Link>
                      </td>
                    </tr>
                  )) }
                </tbody>
              </table>
            </div>
          ) }
        </DashboardCard>

        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-slate-500">
            Tổng cộng { formatNumber(pagination?.total) } kỳ doanh thu
          </p>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={ () => setPage((current) => Math.max(current - 1, 1)) }
              disabled={ currentPage <= 1 || isLoading }
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[12px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowLeft size={ 14 } />
              Trước
            </button>

            <span className="inline-flex h-8 items-center rounded-lg bg-slate-100 px-3 text-[12px] font-semibold text-slate-700">
              { currentPage } / { totalPages }
            </span>

            <button
              type="button"
              onClick={ () =>
                setPage((current) => Math.min(current + 1, totalPages))
              }
              disabled={ currentPage >= totalPages || isLoading }
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[12px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sau
              <ArrowRight size={ 14 } />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RevenueHistoryPage;