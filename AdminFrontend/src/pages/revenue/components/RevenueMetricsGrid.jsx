import {
  CircleDollarSign,
  Coins,
  Landmark,
  TrendingUp,
} from "lucide-react";
import { getDelta, formatCurrency, formatNumber } from "../utils";
import { MetricCard } from "./RevenueShared";

const RevenueMetricsGrid = ({
  summary,
  previousSummary,
  previousPeriodLabel,
  metadata,
}) => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <MetricCard
      label="Doanh thu premium"
      value={formatCurrency(summary?.premiumRevenue)}
      icon={<CircleDollarSign size={20} />}
      hint={`So voi ${previousPeriodLabel}`}
      delta={getDelta(summary?.premiumRevenue, previousSummary?.premiumRevenue)}
      accent="bg-emerald-500"
    />
    <MetricCard
      label="Quy nghe si"
      value={formatCurrency(summary?.artistPool)}
      icon={<Coins size={20} />}
      hint={`${metadata?.revenueSharePercent?.artist || 0}% chia cho artist`}
      delta={getDelta(summary?.artistPool, previousSummary?.artistPool)}
      accent="bg-amber-400"
    />
    <MetricCard
      label="Doanh thu nen tang"
      value={formatCurrency(summary?.platformRevenue)}
      icon={<Landmark size={20} />}
      hint={`${metadata?.revenueSharePercent?.platform || 0}% giu lai he thong`}
      delta={getDelta(
        summary?.platformRevenue,
        previousSummary?.platformRevenue
      )}
      accent="bg-slate-950"
    />
    <MetricCard
      label="Giao dich thanh cong"
      value={formatNumber(summary?.successfulTransactions)}
      icon={<TrendingUp size={20} />}
      hint="So giao dich nap tien hoan tat"
      delta={getDelta(
        summary?.successfulTransactions,
        previousSummary?.successfulTransactions
      )}
      accent="bg-sky-500"
    />
  </div>
);

export default RevenueMetricsGrid;
