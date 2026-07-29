import { ExternalLink } from "lucide-react";

export const SummaryItem = ({ icon: Icon, label, value }) => (
  <div className="rounded-2xl bg-slate-100 px-4 py-4">
    <div className="flex items-center gap-2 text-slate-500">
      <Icon size={15} />
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-700/80">
        {label}
      </p>
    </div>
    <p className="mt-2.5 text-sm font-semibold leading-6 text-slate-900">
      {value || "-"}
    </p>
  </div>
);

export const Field = ({ label, value }) => (
  <div className="space-y-2">
    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-700/80">
      {label}
    </p>
    <p className="text-sm font-medium leading-6 text-slate-900">{value || "-"}</p>
  </div>
);

export const Section = ({ title, icon: Icon, children }) => (
  <section className="rounded-[1.75rem] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
        <Icon size={18} />
      </div>
      <h2 className="text-lg font-semibold tracking-tight text-slate-950">
        {title}
      </h2>
    </div>
    <div className="mt-6">{children}</div>
  </section>
);

export const LinkList = ({ items = [] }) => {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">-</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <a
          key={`${item}-${index}`}
          href={item}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between gap-3 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-900 transition hover:bg-sky-50"
        >
          <span className="truncate">{item}</span>
          <ExternalLink size={15} />
        </a>
      ))}
    </div>
  );
};

export const PreviewImage = ({ title, src }) => (
  <div className="space-y-3">
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700/80">
      {title}
    </p>
    {src ? (
      <a href={src} target="_blank" rel="noreferrer" className="block">
        <img src={src} alt={title} className="h-60 w-full rounded-2xl object-cover" />
      </a>
    ) : (
      <div className="flex h-60 items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-500">
        Không có ảnh
      </div>
    )}
  </div>
);

export const ChecklistStatusItem = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-100 px-4 py-3">
    <span className="text-sm text-slate-900">{label}</span>
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        value === true
          ? "bg-emerald-100 text-emerald-800"
          : value === false
          ? "bg-rose-100 text-rose-700"
          : "bg-slate-200 text-slate-600"
      }`}
    >
      {value === true ? "Đạt" : value === false ? "Không đạt" : "Chưa đánh giá"}
    </span>
  </div>
);

export const ChecklistReviewItem = ({ label, value, onChange, disabled }) => (
  <div className="rounded-2xl bg-slate-100 px-4 py-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-slate-900">{label}</p>

      <div className="inline-flex rounded-xl bg-white/90 p-1 shadow-sm ring-1 ring-slate-200/80">
        <button
          type="button"
          onClick={() => onChange(true)}
          disabled={disabled}
          className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
            value === true
              ? "bg-sky-100 text-sky-700"
              : "text-slate-600 hover:bg-sky-50"
          } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
        >
          Đạt
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          disabled={disabled}
          className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
            value === false
              ? "bg-rose-100 text-rose-700"
              : "text-slate-600 hover:bg-rose-50"
          } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
        >
          Không đạt
        </button>
      </div>
    </div>
  </div>
);
