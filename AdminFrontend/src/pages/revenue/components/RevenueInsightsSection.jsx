import { buildInsightItems } from "../utils";
import { DashboardCard, SectionHeader } from "./RevenueShared";

const RevenueInsightsSection = ({ dashboard }) => {
  const insightItems = buildInsightItems(dashboard);

  return (
    <DashboardCard>
      <SectionHeader
        eyebrow="Operator Notes"
        title="Diem can chu y"
        description="Cac tin hieu nhanh de admin uu tien xu ly hoac kiem tra lai du lieu."
      />

      <div className="space-y-3 p-5">
        {insightItems.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
            Chua co canh bao noi bat trong ky doanh thu nay.
          </div>
        ) : (
          insightItems.map((item) => (
            <div
              key={item.title}
              className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
            >
              <p className="text-sm font-semibold text-slate-950">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {item.description}
              </p>
            </div>
          ))
        )}
      </div>
    </DashboardCard>
  );
};

export default RevenueInsightsSection;
