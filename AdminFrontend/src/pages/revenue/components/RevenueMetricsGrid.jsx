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
  metadata,
}) => (
  <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
    <MetricCard
      label="Doanh thu premium"
      value={formatCurrency(summary?.premiumRevenue)}
      icon={<CircleDollarSign size={20} />}
      hint="Tổng doanh thu từ người dùng premium trong kỳ đang chọn"
      delta={getDelta(summary?.premiumRevenue, previousSummary?.premiumRevenue)}
      accent="bg-violet-500"
    />
    <MetricCard
      label="Quỹ nghệ sĩ"
      value={formatCurrency(summary?.artistPool)}
      icon={<Coins size={20} />}
      hint={`${metadata?.revenueSharePercent?.artist || 0}% doanh thu premium được phân bổ cho nghệ sĩ`}
      delta={getDelta(summary?.artistPool, previousSummary?.artistPool)}
      accent="bg-fuchsia-500"
    />
    <MetricCard
      label="Doanh thu nền tảng"
      value={formatCurrency(summary?.platformRevenue)}
      icon={<Landmark size={20} />}
      hint={`${metadata?.revenueSharePercent?.platform || 0}% doanh thu premium được giữ lại cho hệ thống`}
      delta={getDelta(
        summary?.platformRevenue,
        previousSummary?.platformRevenue
      )}
      accent="bg-indigo-500"
    />
    <MetricCard
      label="Giao dịch thành công"
      value={formatNumber(summary?.successfulTransactions)}
      icon={<TrendingUp size={20} />}
      hint="Số giao dịch nạp tiền hoàn tất trong kỳ doanh thu hiện tại"
      delta={getDelta(
        summary?.successfulTransactions,
        previousSummary?.successfulTransactions
      )}
      accent="bg-violet-300"
    />
  </div>
);

export default RevenueMetricsGrid;
