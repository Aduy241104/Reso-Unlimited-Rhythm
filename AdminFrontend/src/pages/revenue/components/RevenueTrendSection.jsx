import RevenueSplitChart from "./RevenueSplitChart";
import { DashboardCard, SectionHeader } from "./RevenueShared";

const RevenueTrendSection = ({ charts }) => {
  return (
    <DashboardCard>
      <SectionHeader
        eyebrow="Tong quan doanh thu"
        title="Bieu do doanh thu"
        description="Theo doi xu huong doanh thu theo thang va bien dong 14 ngay gan nhat duoc dong bo tu he thong."
      />

      <div className="p-5">
        <RevenueSplitChart charts={charts} />
      </div>
    </DashboardCard>
  );
};

export default RevenueTrendSection;
