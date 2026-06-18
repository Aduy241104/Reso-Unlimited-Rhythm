import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { STATUS_CONFIG } from "../constants";

export const DashboardCard = ({ className = "", children }) => (
  <div
    className={`rounded-[28px] border border-slate-200/80 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)] ${className}`}
  >
    {children}
  </div>
);

export const SectionHeader = ({ eyebrow, title, description, action }) => (
  <div className="flex flex-col gap-4 border-b border-slate-200/80 px-5 py-5 lg:flex-row lg:items-start lg:justify-between">
    <div className="space-y-2">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">
          {eyebrow}
        </p>
      ) : null}
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-950">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        ) : null}
      </div>
    </div>
    {action}
  </div>
);

export const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.not_created;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${config.tone}`}
    >
      {config.label}
    </span>
  );
};

export const MetricCard = ({ label, value, icon, hint, delta, accent }) => {
  const toneClass =
    delta?.trend === "up"
      ? "bg-emerald-50 text-emerald-700"
      : delta?.trend === "down"
        ? "bg-rose-50 text-rose-700"
        : "bg-slate-100 text-slate-600";

  return (
    <DashboardCard className="overflow-hidden">
      <div className={`h-1.5 ${accent}`} />
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              {label}
            </p>
            <p className="text-2xl font-semibold tracking-tight text-slate-950">
              {value}
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
            {icon}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500">{hint}</p>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${toneClass}`}
          >
            {delta?.trend === "up" ? <ArrowUpRight size={14} /> : null}
            {delta?.trend === "down" ? <ArrowDownRight size={14} /> : null}
            {delta?.diff === 0
              ? "Khong doi"
              : `${delta?.percent > 0 ? "+" : ""}${delta?.percent?.toFixed(1)}%`}
          </span>
        </div>
      </div>
    </DashboardCard>
  );
};
