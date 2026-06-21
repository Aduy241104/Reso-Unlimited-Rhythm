import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { STATUS_CONFIG } from "../constants";

export const DashboardCard = ({ className = "", children }) => (
  <div
    className={ `overflow-hidden rounded-2xl border border-slate-200 bg-white ${className}` }
  >
    { children }
  </div>
);

export const SectionHeader = ({ eyebrow, title, description, action }) => (
  <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
    <div className="space-y-1">
      { eyebrow ? (
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-500">
          { eyebrow }
        </p>
      ) : null }

      <div>
        <h2 className="text-base font-semibold tracking-tight text-slate-900">
          { title }
        </h2>

        { description ? (
          <p className="mt-1 text-sm leading-6 text-slate-500">
            { description }
          </p>
        ) : null }
      </div>
    </div>

    { action }
  </div>
);

export const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.not_created;

  return (
    <span
      className={ `inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${config.tone}` }
    >
      { config.label }
    </span>
  );
};

export const StatCard = ({
  label,
  value,
  helper,
  icon,
  className = "",
}) => (
  <DashboardCard className={ className }>
    <div className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-500">
            { label }
          </p>

          <p className="text-[1.65rem] font-bold leading-tight tracking-[-0.03em] text-slate-900">
            { value }
          </p>
        </div>

        { icon ? (
          <div className="shrink-0 text-violet-500">
            { icon }
          </div>
        ) : null }
      </div>

      { helper ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="text-[13px] leading-6 text-slate-500">
            { helper }
          </p>
        </div>
      ) : null }
    </div>
  </DashboardCard>
);

export const MetricDeltaPill = ({ delta }) => {
  const toneClass =
    delta?.trend === "up"
      ? "bg-emerald-50 text-emerald-700"
      : delta?.trend === "down"
        ? "bg-rose-50 text-rose-700"
        : "bg-slate-100 text-slate-600";

  return (
    <span
      className={ `inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${toneClass}` }
    >
      { delta?.trend === "up" ? <ArrowUpRight size={ 12 } /> : null }
      { delta?.trend === "down" ? <ArrowDownRight size={ 12 } /> : null }

      { delta?.diff === 0
        ? "Không đổi"
        : `${delta?.percent > 0 ? "+" : ""}${delta?.percent?.toFixed(1)}%` }
    </span>
  );
};