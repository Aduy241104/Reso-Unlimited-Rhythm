import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { CHART_COLORS } from "../constants";
import { formatCurrency } from "../utils";
import { DashboardCard, SectionHeader } from "./RevenueShared";
import { RevenueTooltipContent } from "./RevenueCharts";

const RevenueSplitSection = ({ summary }) => {
  const shareChartData = [
    { name: "Quy nghe si", value: Number(summary?.artistPool || 0) },
    { name: "Doanh thu nen tang", value: Number(summary?.platformRevenue || 0) },
  ];

  return (
    <DashboardCard>
      <SectionHeader
        eyebrow="Revenue Split"
        title="Phan bo doanh thu trong ky"
        description="Nhin nhanh cach doanh thu premium duoc phan chia giua nghe si va nen tang."
      />

      <div className="grid gap-6 p-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={shareChartData}
                innerRadius={72}
                outerRadius={108}
                paddingAngle={4}
                dataKey="value"
              >
                {shareChartData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<RevenueTooltipContent />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4">
          {shareChartData.map((item, index) => {
            const sharePercent =
              Number(summary?.premiumRevenue || 0) > 0
                ? (item.value / Number(summary?.premiumRevenue || 1)) * 100
                : 0;

            return (
              <div
                key={item.name}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-3.5 w-3.5 rounded-full"
                    style={{
                      backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                    }}
                  />
                  <p className="text-sm font-semibold text-slate-900">
                    {item.name}
                  </p>
                </div>
                <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                  {formatCurrency(item.value)}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Chiem {sharePercent.toFixed(1)}% doanh thu premium cua ky.
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardCard>
  );
};

export default RevenueSplitSection;
