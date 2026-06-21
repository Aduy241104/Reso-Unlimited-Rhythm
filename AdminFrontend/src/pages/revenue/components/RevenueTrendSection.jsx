import RevenueSplitChart from "./RevenueSplitChart";
import { DashboardCard, SectionHeader } from "./RevenueShared";

const RevenueTrendSection = ({ charts }) => {
  return (
    <DashboardCard>
      <SectionHeader
        eyebrow="Revenue Trend"
        title="Bieu do doanh thu"
        description="Line chart + fill duoc ve truc tiep tu du lieu monthly va last 14 days cua API moi."
      />

      <div className="p-5">
        <RevenueSplitChart charts={charts} />
      </div>
    </DashboardCard>
  );
};

export default RevenueTrendSection;
