import { DashboardCard } from "./RevenueShared";

const RevenueSummaryCard = ({ icon, label, value, helper }) => (
  <DashboardCard className="border-slate-200">
    <div className="flex items-start justify-between gap-3 p-5">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          {label}
        </p>
        <p className="mt-2 text-[1.6rem] font-semibold tracking-tight text-slate-950">
          {value}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-500">{helper}</p>
      </div>

      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
        {icon}
      </div>
    </div>
  </DashboardCard>
);

export default RevenueSummaryCard;
