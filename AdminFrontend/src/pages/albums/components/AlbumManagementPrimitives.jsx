export const Section = ({ title, icon, children, action }) => {
  const iconNode = icon ? icon({ size: 18 }) : null;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-slate-900">
            {iconNode}
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">
            {title}
          </h2>
        </div>
        {action || null}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
};

export const Field = ({ label, value, helper }) => (
  <div className="space-y-2">
    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
      {label}
    </p>
    <p className="break-words text-sm font-medium leading-6 text-slate-950">
      {value || "-"}
    </p>
    {helper ? <p className="text-xs leading-5 text-slate-500">{helper}</p> : null}
  </div>
);

export const StatCard = ({ label, value, helper }) => (
  <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
    <p className="text-xs font-medium text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
      {value}
    </p>
    {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
  </div>
);

export const StatusBadge = ({ config, tone = "default" }) => (
  <span
    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
      tone === "neutral"
        ? "border border-slate-300 bg-slate-100 text-slate-800"
        : `ring-1 ring-inset ${config.className}`
    }`}
  >
    {config.label}
  </span>
);

export const EmptyState = ({ title, description }) => (
  <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
    <p className="text-sm font-semibold text-slate-900">{title}</p>
    {description ? (
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    ) : null}
  </div>
);
