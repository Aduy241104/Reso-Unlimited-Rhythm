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
    : "Ky truoc";

  const comparisonItems = [
    {
      key: "premiumRevenue",
      label: "Doanh thu premium",
      current: summary?.premiumRevenue,
      previous: previousSummary?.premiumRevenue,
    },
    {
      key: "artistPool",
      label: "Quy nghe si",
      current: summary?.artistPool,
      previous: previousSummary?.artistPool,
    },
    {
      key: "platformRevenue",
      label: "Doanh thu nen tang",
      current: summary?.platformRevenue,
      previous: previousSummary?.platformRevenue,
    },
    {
      key: "successfulTransactions",
      label: "Giao dich thanh cong",
      current: summary?.successfulTransactions,
      previous: previousSummary?.successfulTransactions,
      isCount: true,
    },
  ];

  return (
    <DashboardCard>
      <SectionHeader
        eyebrow="Period Comparison"
        title="So sanh voi ky truoc"
        description={`Doi chieu nhanh ${periodLabel} voi ${previousPeriodLabel} de nhan ra bien dong.`}
      />

      <div className="overflow-x-auto p-5">
        <table className="min-w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.18em] text-slate-400">
              <th className="pb-3 font-semibold">Chi so</th>
              <th className="pb-3 font-semibold">{periodLabel}</th>
              <th className="pb-3 font-semibold">{previousPeriodLabel}</th>
              <th className="pb-3 text-right font-semibold">Bien dong</th>
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
                  className="border-b border-slate-100 last:border-b-0"
                >
                  <td className="py-4 text-sm font-medium text-slate-700">
                    {item.label}
                  </td>
                  <td className="py-4 text-sm font-semibold text-slate-950">
                    {item.isCount
                      ? formatNumber(item.current)
                      : formatCurrency(item.current)}
                  </td>
                  <td className="py-4 text-sm text-slate-500">
                    {item.isCount
                      ? formatNumber(item.previous)
                      : formatCurrency(item.previous)}
                  </td>
                  <td className="py-4 text-right">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}`}
                    >
                      {delta.trend === "up" ? <ArrowUpRight size={14} /> : null}
                      {delta.trend === "down" ? (
                        <ArrowDownRight size={14} />
                      ) : null}
                      {delta.diff === 0
                        ? "Khong doi"
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
    </DashboardCard>
  );
};

export default RevenueComparisonSection;
