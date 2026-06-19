import RevenueSplitChart from "./RevenueSplitChart";
import { DashboardCard, SectionHeader } from "./RevenueShared";
import { formatCurrency, formatNumber } from "../utils";

const RevenueSplitSection = ({ summary, metadata, charts }) => {
  const premiumRevenue = Number(summary?.premiumRevenue || 0);
  const artistPool = Number(summary?.artistPool || 0);
  const platformRevenue = Number(summary?.platformRevenue || 0);
  const successfulTransactions = Number(summary?.successfulTransactions || 0);
  const undistributedArtistBalance = Number(
    summary?.undistributedArtistBalance || 0
  );
  const averageRevenuePerTransaction =
    successfulTransactions > 0 ? premiumRevenue / successfulTransactions : 0;
  const latestMonthlyPoint = Array.isArray(charts?.monthly)
    ? charts.monthly[charts.monthly.length - 1]
    : null;
  const last14DaysActiveCount = Array.isArray(charts?.last14Days)
    ? charts.last14Days.filter((item) => Number(item.premiumRevenue || 0) > 0).length
    : 0;

  const splitItems = [
    {
      label: "Quy nghe si",
      value: artistPool,
      helper: `${metadata?.revenueSharePercent?.artist || 0}% doanh thu premium phan bo cho artist`,
      tone: "bg-violet-500",
    },
    {
      label: "Doanh thu nen tang",
      value: platformRevenue,
      helper: `${metadata?.revenueSharePercent?.platform || 0}% doanh thu premium giu lai cho he thong`,
      tone: "bg-slate-950",
    },
    {
      label: "Chua phan phoi",
      value: undistributedArtistBalance,
      helper: "Phan doanh thu artist da ghi nhan nhung chua dua vao doi soat",
      tone: "bg-slate-300",
    },
  ];

  return (
    <DashboardCard>
      <SectionHeader
        eyebrow="Revenue Trends"
        title="Xu huong doanh thu va phan bo"
        description="Dung line chart co fill de theo doi bien dong doanh thu theo thang va 14 ngay gan nhat tu response moi cua API."
      />

      <div className="space-y-5 p-5">
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <RevenueSplitChart charts={charts} />

       
        </div>
      </div>
    </DashboardCard>
  );
};

export default RevenueSplitSection;
