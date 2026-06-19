import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { MONTH_LABELS } from "../constants";
import { formatCurrency, formatNumber, getDelta } from "../utils";
import { DashboardCard, SectionHeader } from "./RevenueShared";

const RevenueComparisonSection = ({
  selectedYear,
  selectedMonth,
  summary,
  previousDashboard,
  previousSummary,
}) => {
  const periodLabel = `${MONTH_LABELS[(selectedMonth || 1) - 1]} ${selectedYear}`;
  const previousPeriodLabel = previousDashboard?.period
    ? `${MONTH_LABELS[(previousDashboard.period.month || 1) - 1]} ${previousDashboard.period.year}`
    : "Kỳ trước";

  const comparisonItems = [
    {
      key: "premiumRevenue",
      label: "Doanh thu premium",
      current: summary?.premiumRevenue,
      previous: previousSummary?.premiumRevenue,
    },
    {
      key: "artistPool",
      label: "Quỹ nghệ sĩ",
      current: summary?.artistPool,
      previous: previousSummary?.artistPool,
    },
    {
      key: "platformRevenue",
      label: "Doanh thu nền tảng",
      current: summary?.platformRevenue,
      previous: previousSummary?.platformRevenue,
    },
    {
      key: "successfulTransactions",
      label: "Giao dịch thành công",
      current: summary?.successfulTransactions,
      previous: previousSummary?.successfulTransactions,
      isCount: true,
    },
  ];

  return (
    <DashboardCard className="h-full">
      <SectionHeader
        eyebrow="Period Comparison"
        title="So sánh với kỳ trước"
        description={`Đối chiếu nhanh ${periodLabel} với ${previousPeriodLabel} để nhận ra biến động.`}
      />

      <div className="space-y-3 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Kỳ hiện tại
            </p>
            <p className="mt-2 text-[1.05rem] font-semibold text-slate-950">
              {periodLabel}
            </p>
          </div>
          <div className="border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Kỳ so sánh
            </p>
            <p className="mt-2 text-[1.05rem] font-semibold text-slate-950">
              {previousPeriodLabel}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-400">
                <th className="px-4 py-3 font-semibold">Chỉ số</th>
                <th className="px-4 py-3 font-semibold">{periodLabel}</th>
                <th className="px-4 py-3 font-semibold">{previousPeriodLabel}</th>
                <th className="px-4 py-3 text-right font-semibold">Biến động</th>
              </tr>
            </thead>
            <tbody>
              {comparisonItems.map((item) => {
                const delta = getDelta(item.current, item.previous);
                const badgeClass =
                  delta.trend === "up"
                    ? "bg-emerald-50 text-emerald-700"
                    : delta.trend === "down"
                      ? "bg-rose-50 text-rose-700"
                      : "bg-slate-100 text-slate-600";

                return (
                  <tr
                    key={item.key}
                    className="border-b border-slate-100 transition-colors hover:bg-slate-50 last:border-b-0"
                  >
                    <td className="px-4 py-3.5 text-sm font-medium text-slate-700">
                      {item.label}
                    </td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-slate-950">
                      {item.isCount
                        ? formatNumber(item.current)
                        : formatCurrency(item.current)}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-500">
                      {item.isCount
                        ? formatNumber(item.previous)
                        : formatCurrency(item.previous)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}`}
                      >
                        {delta.trend === "up" ? <ArrowUpRight size={14} /> : null}
                        {delta.trend === "down" ? (
                          <ArrowDownRight size={14} />
                        ) : null}
                        {delta.diff === 0
                          ? "Không đổi"
                          : item.isCount
                            ? `${delta.diff > 0 ? "+" : ""}${formatNumber(
                                delta.diff
                              )}`
                            : `${delta.diff > 0 ? "+" : ""}${formatCurrency(
                                delta.diff
                              )}`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardCard>
  );
};

export default RevenueComparisonSection;
