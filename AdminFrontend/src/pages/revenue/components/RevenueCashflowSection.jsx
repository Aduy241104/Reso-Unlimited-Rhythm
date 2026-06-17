import { Landmark, RefreshCw, Wallet } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_COLORS } from "../constants";
import { formatCompactCurrency, formatCurrency } from "../utils";
import { DashboardCard, SectionHeader } from "./RevenueShared";
import { RevenueTooltipContent } from "./RevenueCharts";

const RevenueCashflowSection = ({ summary }) => {
  const cashflowChartData = [
    {
      name: "So du nghe si",
      value: Number(summary?.artistAvailableBalance || 0),
    },
    {
      name: "Cho rut",
      value: Number(summary?.pendingWithdrawalAmount || 0),
    },
    {
      name: "Da chi",
      value: Number(summary?.paidWithdrawalAmount || 0),
    },
  ];

  return (
    <DashboardCard>
      <SectionHeader
        eyebrow="Cashflow"
        title="Dong tien can theo doi"
        description="Tap trung vao so du co the chi, khoan cho rut va tong tien da chi tra."
      />

      <div className="space-y-5 p-5">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cashflowChartData} barGap={18}>
              <CartesianGrid vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#475569", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => formatCompactCurrency(value)}
                tick={{ fill: "#94a3b8", fontSize: 12 }}
              />
              <Tooltip content={<RevenueTooltipContent />} cursor={false} />
              <Bar dataKey="value" radius={[16, 16, 0, 0]}>
                {cashflowChartData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid gap-3">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <Wallet size={18} className="text-emerald-600" />
              <span className="text-sm font-medium text-slate-600">
                So du nghe si kha dung
              </span>
            </div>
            <span className="text-sm font-semibold text-slate-950">
              {formatCurrency(summary?.artistAvailableBalance)}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <RefreshCw size={18} className="text-amber-500" />
              <span className="text-sm font-medium text-slate-600">
                Rut tien dang cho
              </span>
            </div>
            <span className="text-sm font-semibold text-slate-950">
              {formatCurrency(summary?.pendingWithdrawalAmount)}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <Landmark size={18} className="text-slate-700" />
              <span className="text-sm font-medium text-slate-600">
                Da chi tra cho nghe si
              </span>
            </div>
            <span className="text-sm font-semibold text-slate-950">
              {formatCurrency(summary?.paidWithdrawalAmount)}
            </span>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
};

export default RevenueCashflowSection;
