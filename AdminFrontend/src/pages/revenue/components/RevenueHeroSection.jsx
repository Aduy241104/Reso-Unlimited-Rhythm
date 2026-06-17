import { CalendarRange, CircleDollarSign, RefreshCw } from "lucide-react";
import { MONTH_LABELS, STATUS_CONFIG } from "../constants";
import { formatDate, formatDateTime } from "../utils";
import { DashboardCard, StatusBadge } from "./RevenueShared";

const RevenueHeroSection = ({
  currentYear,
  selectedYear,
  selectedMonth,
  setSelectedYear,
  setSelectedMonth,
  period,
  metadata,
  isRefreshing,
  onRefresh,
}) => {
  const periodLabel = `${MONTH_LABELS[(selectedMonth || 1) - 1]} ${selectedYear}`;
  const yearOptions = Array.from({ length: 6 }, (_, index) => currentYear - index);
  const statusConfig = STATUS_CONFIG[period?.status] || STATUS_CONFIG.not_created;

  return (
    <DashboardCard className="overflow-hidden border-0 bg-slate-950 text-white shadow-[0_28px_80px_rgba(15,23,42,0.2)]">
      <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.35fr_0.85fr] lg:px-8">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
            <CircleDollarSign size={14} />
            Revenue Control Center
          </div>

          <div className="space-y-3">
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-white lg:text-4xl">
              Quan ly doanh thu truc quan theo tung ky doi soat.
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-300">
              Theo doi doanh thu premium, phan chia cho nghe si, doanh thu nen tang va trang thai chi tra trong cung mot man hinh.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <StatusBadge status={period?.status} />
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
              <CalendarRange size={14} />
              {periodLabel}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
              <RefreshCw size={14} />
              Cap nhat: {formatDateTime(metadata?.lastUpdatedAt)}
            </span>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">
                Ky dang xem
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                {periodLabel}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => void onRefresh()}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={isRefreshing ? "animate-spin" : ""}
              />
              Lam moi
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">
                Nam
              </span>
              <select
                value={selectedYear}
                onChange={(event) => setSelectedYear(Number(event.target.value))}
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-medium text-white outline-none transition focus:border-emerald-300"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year} className="text-slate-900">
                    {year}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">
                Thang
              </span>
              <select
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(Number(event.target.value))}
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-medium text-white outline-none transition focus:border-emerald-300"
              >
                {MONTH_LABELS.map((monthLabel, index) => (
                  <option
                    key={monthLabel}
                    value={index + 1}
                    className="text-slate-900"
                  >
                    {monthLabel}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm font-semibold text-white">
              {statusConfig.label}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {statusConfig.helper}
            </p>
            <div className="mt-4 grid gap-2 text-sm text-slate-300">
              <div className="flex items-center justify-between gap-3">
                <span>Tu ngay</span>
                <span className="font-semibold text-white">
                  {formatDate(period?.periodStart)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Den ngay</span>
                <span className="font-semibold text-white">
                  {formatDate(period?.periodEnd)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
};

export default RevenueHeroSection;
