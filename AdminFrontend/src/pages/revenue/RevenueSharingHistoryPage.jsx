import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CircleDollarSign,
  Coins,
  LoaderCircle,
  RefreshCw,
  UsersRound,
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

const OverviewCard = ({ icon, label, value, helper }) => {
  const Icon = icon;

  return (
    <DashboardCard className="border-slate-200">
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {label}
          </p>
          <p className="mt-1.5 text-[1.35rem] font-semibold tracking-tight text-slate-950">
            {value}
          </p>
          <p className="mt-1.5 text-[13px] leading-6 text-slate-500">
            {helper}
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          <Icon size={18} />
        </div>
      </div>
    </DashboardCard>
  );
};

const RevenueSharingHistoryPage = () => {
  const [periods, setPeriods] = useState([]);
  const [pagination, setPagination] = useState(DEFAULT_META);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    const loadPeriods = async () => {
      setIsLoading(true);
      setError("");

      try {
        const result = await getRevenuePeriodsService({
          page,
          limit: PAGE_SIZE,
        });

        if (!isActive) return;

        setPeriods(result.periods ?? []);
        setPagination(result.meta ?? DEFAULT_META);
      } catch (apiError) {
        if (!isActive) return;
        setError(getErrorMessage(apiError));
        setPeriods([]);
        setPagination(DEFAULT_META);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadPeriods();

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

      setPeriods(result.periods ?? []);
      setPagination(result.meta ?? DEFAULT_META);
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setIsRefreshing(false);
    }
  };

  const latestPeriod = periods[0];
  const currentPage = pagination?.page ?? page;
  const totalPages = pagination?.totalPages ?? 1;

  return (
    <section className="-mt-2 bg-[linear-gradient(180deg,#fcfcfd_0%,#f4f4f5_100%)] py-1 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-4">
        <DashboardCard className="border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_58%,#f3f4f6_100%)] px-5 py-5 lg:px-6 lg:py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                <CircleDollarSign size={13} />
                Chia doanh thu
              </span>

              <div className="space-y-2">
                <h1 className="text-[1.7rem] font-semibold tracking-tight text-slate-950">
                  Lịch sử chia doanh thu theo kỳ
                </h1>
                <p className="max-w-3xl text-[13px] leading-6 text-slate-600">
                  Trang này tách riêng với dashboard doanh thu hiện tại. Mỗi kỳ
                  chỉ hiển thị các số liệu quan trọng để tra cứu nhanh.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={15}
                className={isRefreshing ? "animate-spin" : undefined}
              />
              Làm mới
            </button>
          </div>
        </DashboardCard>

        <div className="grid gap-4 md:grid-cols-3">
          <OverviewCard
            icon={CircleDollarSign}
            label="Tổng số kỳ"
            value={formatNumber(pagination?.total)}
            helper="Tổng kỳ doanh thu hiện có trên hệ thống."
          />
          <OverviewCard
            icon={Coins}
            label="Premium gần nhất"
            value={formatCurrency(latestPeriod?.summary?.premiumRevenue)}
            helper={
              latestPeriod?.label
                ? `Kỳ mới nhất là ${latestPeriod.label}.`
                : "Chưa có dữ liệu kỳ nào."
            }
          />
          <OverviewCard
            icon={UsersRound}
            label="Nghệ sĩ nhận chia"
            value={formatNumber(
              latestPeriod?.distribution?.distributedArtistCount
            )}
            helper="Số nghệ sĩ được phân bổ trong kỳ mới nhất."
          />
        </div>

        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-rose-700">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            <p className="text-[13px] leading-6">{error}</p>
          </div>
        ) : null}

        <DashboardCard className="border-slate-200">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                Danh sách kỳ doanh thu
              </h2>
              <p className="mt-1 text-[13px] text-slate-500">
                Trang {currentPage} / {totalPages}
              </p>
            </div>
            <p className="text-[13px] text-slate-500">
              Tối đa {PAGE_SIZE} bản ghi mỗi trang
            </p>
          </div>

          {isLoading ? (
            <div className="flex min-h-[280px] items-center justify-center px-5 py-10 text-slate-500">
              <div className="flex items-center gap-3">
                <LoaderCircle size={20} className="animate-spin" />
                <span className="text-[13px] font-medium">
                  Đang tải lịch sử chia doanh thu...
                </span>
              </div>
            </div>
          ) : periods.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <p className="text-[13px] font-medium text-slate-600">
                Chưa có kỳ doanh thu nào để hiển thị.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {periods.map((period) => (
                <article
                  key={period.id}
                  className="grid gap-4 px-5 py-4 transition hover:bg-slate-50 lg:grid-cols-[1.05fr_0.8fr_0.8fr_0.7fr_0.9fr_auto] lg:items-center"
                >
                  <div className="space-y-1.5">
                    <p className="text-base font-semibold text-slate-950">
                      {period.label}
                    </p>
                    <p className="text-[13px] text-slate-500">
                      Xác nhận:{" "}
                      {formatDateTime(
                        period.timestamps?.confirmedAt ||
                          period.timestamps?.calculatedAt ||
                          period.timestamps?.closedAt
                      )}
                    </p>
                  </div>

                  <div>
                    <StatusBadge status={period.status} />
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Premium
                    </p>
                    <p className="mt-1.5 text-[13px] font-semibold text-slate-950">
                      {formatCurrency(period.summary?.premiumRevenue)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Quỹ nghệ sĩ
                    </p>
                    <p className="mt-1.5 text-[13px] font-semibold text-slate-950">
                      {formatCurrency(period.summary?.artistPool)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Đã chia cho
                    </p>
                    <p className="mt-1.5 text-[13px] font-semibold text-slate-950">
                      {formatNumber(
                        period.distribution?.distributedArtistCount
                      )}{" "}
                      nghệ sĩ
                    </p>
                  </div>

                  <div>
                    <Link
                      to={routePaths.revenueSharingDetail(period.id)}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Xem chi tiết
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </DashboardCard>

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-slate-500">
            Tổng cộng {formatNumber(pagination?.total)} kỳ doanh thu
          </p>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              disabled={currentPage <= 1 || isLoading}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3.5 py-2 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowLeft size={15} />
              Trước
            </button>

            <span className="rounded-full bg-slate-100 px-3.5 py-2 text-[13px] font-semibold text-slate-700">
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.min(current + 1, totalPages))
              }
              disabled={currentPage >= totalPages || isLoading}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3.5 py-2 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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

export default RevenueSharingHistoryPage;
