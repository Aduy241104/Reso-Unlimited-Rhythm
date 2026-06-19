import { AlertCircle, ArrowLeft, CalendarRange, LoaderCircle } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { routePaths } from "../../routes/routePaths";
import { DashboardCard, StatCard, StatusBadge } from "./components/RevenueShared";
import RevenueTrendSection from "./components/RevenueTrendSection";
import useRevenueDashboard from "./useRevenueDashboard";
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  formatPeriodLabel,
} from "./utils";

const RevenuePeriodDetailPage = () => {
  const { year, month } = useParams();
  const selectedYear = Number(year);
  const selectedMonth = Number(month);
  const { dashboard, isLoading, isRefreshing, error, handleRefresh } =
    useRevenueDashboard(selectedYear, selectedMonth);

  const summary = dashboard?.summary || {};
  const metadata = dashboard?.metadata || {};
  const charts = dashboard?.charts || {};
  const period = dashboard?.period || {
    year: selectedYear,
    month: selectedMonth,
  };
  const periodLabel = formatPeriodLabel(period.year, period.month);

  return (
    <section className="-mt-2 bg-[linear-gradient(180deg,#fdfdfe_0%,#f5f5f7_100%)] py-1">
      <div className="mx-auto max-w-7xl space-y-4">
        <DashboardCard className="border-violet-200/60 bg-[linear-gradient(135deg,#ffffff_0%,#fcfbff_58%,#f7f4ff_100%)] px-5 py-5 lg:px-6 lg:py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <Link
                to={routePaths.revenueHistory}
                className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700"
              >
                <ArrowLeft size={14} />
                Quay lại lịch sử doanh thu
              </Link>
              <div className="space-y-2">
                <h1 className="text-[1.9rem] font-semibold tracking-tight text-slate-950">
                  Chi tiết doanh thu {periodLabel}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                  <StatusBadge status={period?.status} />
                  <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1">
                    <CalendarRange size={14} />
                    Cập nhật: {formatDateTime(metadata?.lastUpdatedAt)}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Làm mới dữ liệu
            </button>
          </div>
        </DashboardCard>

        {error ? (
          <div className="flex items-start gap-3 rounded-[18px] border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p className="text-sm leading-6">{error}</p>
          </div>
        ) : null}

        {isLoading ? (
          <DashboardCard className="p-10">
            <div className="flex min-h-[320px] items-center justify-center">
              <div className="flex items-center gap-3 text-slate-500">
                <LoaderCircle size={22} className="animate-spin" />
                <span className="text-sm font-medium">
                  Đang tải chi tiết doanh thu...
                </span>
              </div>
            </div>
          </DashboardCard>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
              <StatCard
                label="Doanh thu premium"
                value={formatCurrency(summary?.premiumRevenue)}
                helper="Tổng doanh thu premium của kỳ đã chọn."
              />
              <StatCard
                label="Quỹ nghệ sĩ"
                value={formatCurrency(summary?.artistPool)}
                helper="Phần doanh thu phân bổ cho nghệ sĩ."
              />
              <StatCard
                label="Doanh thu nền tảng"
                value={formatCurrency(summary?.platformRevenue)}
                helper="Phần doanh thu giữ lại cho nền tảng."
              />
              <StatCard
                label="Giao dịch thành công"
                value={formatNumber(summary?.successfulTransactions)}
                helper="Số giao dịch hoàn tất trong kỳ."
              />
            </div>

            <RevenueTrendSection
              summary={summary}
              metadata={metadata}
              charts={charts}
            />
          </>
        )}
      </div>
    </section>
  );
};

export default RevenuePeriodDetailPage;
