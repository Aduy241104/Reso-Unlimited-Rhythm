import {
  CalendarRange,
  CircleDollarSign,
  History,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";
import { routePaths } from "../../../routes/routePaths";
import { MONTH_LABELS, STATUS_CONFIG } from "../constants";
import { formatCurrency, formatDateTime, formatNumber } from "../utils";
import { DashboardCard, StatCard, StatusBadge } from "./RevenueShared";

const RevenueHeroSection = ({
  period,
  metadata,
  summary,
  isRefreshing,
  onRefresh,
}) => {
  const periodLabel = `${MONTH_LABELS[(period?.month || 1) - 1]} ${
    period?.year || ""
  }`.trim();
  const statusConfig = STATUS_CONFIG[period?.status] || STATUS_CONFIG.not_created;

  return (
    <DashboardCard className="border-violet-200/60 bg-[linear-gradient(135deg,#ffffff_0%,#fcfbff_55%,#f7f4ff_100%)]">
      <div className="space-y-5 px-5 py-5 lg:px-6 lg:py-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700">
              <CircleDollarSign size={14} />
              Doanh thu tháng hiện tại
            </div>

            <div className="space-y-2">
              <h1 className="text-[2rem] font-semibold tracking-tight text-slate-950 lg:text-[2.45rem]">
                {periodLabel}
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-600">
                Dashboard tập trung vào dữ liệu của tháng hiện tại để admin theo
                dõi nhanh dòng tiền, trạng thái kỳ và các khoản cần xử lý.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <StatusBadge status={period?.status} />
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1">
                <CalendarRange size={14} />
                Cập nhật: {formatDateTime(metadata?.lastUpdatedAt)}
              </span>
              <span className="rounded-full border border-violet-200 bg-white px-3 py-1 text-slate-500">
                {statusConfig.helper}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void onRefresh()}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={isRefreshing ? "animate-spin" : ""}
              />
              Làm mới
            </button>

            <Link
              to={routePaths.revenueSharingHistory}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <History size={16} />
              Xem chia doanh thu
            </Link>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
          <StatCard
            label="Doanh thu premium"
            value={formatCurrency(summary?.premiumRevenue)}
            helper="Tổng doanh thu premium ghi nhận trong tháng hiện tại."
            accent="from-slate-900 to-violet-600"
            icon={<CircleDollarSign size={18} />}
            className="bg-white"
          />
          <StatCard
            label="Quỹ nghệ sĩ"
            value={formatCurrency(summary?.artistPool)}
            helper={`${metadata?.revenueSharePercent?.artist || 0}% doanh thu premium phân bổ cho nghệ sĩ.`}
            accent="from-slate-900 to-violet-500"
            icon={<CircleDollarSign size={18} />}
            className="bg-white"
          />
          <StatCard
            label="Doanh thu nền tảng"
            value={formatCurrency(summary?.platformRevenue)}
            helper={`${metadata?.revenueSharePercent?.platform || 0}% doanh thu premium giữ lại cho nền tảng.`}
            accent="from-slate-900 to-violet-400"
            icon={<CircleDollarSign size={18} />}
            className="bg-white"
          />
          <StatCard
            label="Giao dịch thành công"
            value={formatNumber(summary?.successfulTransactions)}
            helper="Số giao dịch nạp tiền hoàn tất trong tháng hiện tại."
            accent="from-slate-900 to-violet-300"
            icon={<CircleDollarSign size={18} />}
            className="bg-white"
          />
        </div>
      </div>
    </DashboardCard>
  );
};

export default RevenueHeroSection;
