import { ArrowLeft, CalendarRange, RefreshCw, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { routePaths } from "../../../routes/routePaths";
import { DashboardCard, StatusBadge } from "./RevenueShared";
import { formatDate, formatDateTime } from "../utils";

const RevenuePeriodDetailHero = ({
  period,
  confirmedByLabel,
  updatedAt,
  isRefreshing,
  onRefresh,
  onOpenLifecycle,
  showLifecycleButton,
  title,
}) => (
  <DashboardCard className="border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#eef4ff_100%)] px-5 py-5 lg:px-6 lg:py-6">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-3">
        <Link
          to={routePaths.revenueHistory}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700"
        >
          <ArrowLeft size={14} />
          Quay lại lịch sử doanh thu
        </Link>

        <div className="space-y-2">
          <h1 className="text-[1.9rem] font-semibold tracking-tight text-slate-950">
            {title}
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-slate-600">
            Tra cứu số liệu của kỳ doanh thu đã lưu trên hệ thống và xử lý các
            bước tiếp theo dựa trên trạng thái hiện tại từ backend.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-[13px] text-slate-600">
          <StatusBadge status={period?.status} />

          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1">
            <CalendarRange size={14} />
            {formatDate(period?.periodStart)} - {formatDate(period?.periodEnd)}
          </span>

          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1">
            <UsersRound size={14} />
            {confirmedByLabel}
          </span>

          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1">
            <RefreshCw size={14} />
            Cập nhật: {formatDateTime(updatedAt)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {showLifecycleButton ? (
          <button
            type="button"
            onClick={onOpenLifecycle}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Xem mốc xử lý
          </button>
        ) : null}

        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={15}
            className={isRefreshing ? "animate-spin" : undefined}
          />
          Làm mới dữ liệu
        </button>
      </div>
    </div>
  </DashboardCard>
);

export default RevenuePeriodDetailHero;
