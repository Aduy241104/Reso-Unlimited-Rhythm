import { Activity, CalendarRange, RefreshCw, WalletCards } from "lucide-react";
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "../utils";
import { DashboardCard, SectionHeader, StatusBadge } from "./RevenueShared";

const RevenueCashflowSection = ({ summary, metadata, period }) => {
  const premiumRevenue = Number(summary?.premiumRevenue || 0);
  const artistPool = Number(summary?.artistPool || 0);
  const platformRevenue = Number(summary?.platformRevenue || 0);
  const undistributedArtistBalance = Number(
    summary?.undistributedArtistBalance || 0
  );
  const successfulTransactions = Number(summary?.successfulTransactions || 0);
  const averageRevenuePerTransaction =
    successfulTransactions > 0 ? premiumRevenue / successfulTransactions : 0;
  const artistSettledPercent =
    artistPool > 0
      ? ((artistPool - undistributedArtistBalance) / artistPool) * 100
      : 100;

  const operationalCards = [
    {
      label: "Giao dich thanh cong",
      value: formatNumber(successfulTransactions),
      helper: "So giao dich premium hoan tat trong ky doanh thu nay.",
      icon: <Activity size={18} />,
    },
    {
      label: "Doanh thu moi giao dich",
      value: formatCurrency(averageRevenuePerTransaction),
      helper: "Gia tri premium revenue trung binh tao ra tu moi giao dich.",
      icon: <WalletCards size={18} />,
    },
    {
      label: "Phan can doi soat",
      value: formatCurrency(undistributedArtistBalance),
      helper: "Doanh thu artist dang treo, chua phan bo xong trong he thong.",
      icon: <RefreshCw size={18} />,
    },
  ];

  return (
    <DashboardCard>
      <SectionHeader
        eyebrow="Operations"
        title="Doi soat va van hanh doanh thu"
        description="Tap trung vao tinh trang ky doanh thu, muc san sang doi soat va cac chi so van hanh can theo doi."
      />

      <div className="grid gap-5 p-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="overflow-hidden rounded-[24px] border border-violet-200/60 bg-[linear-gradient(145deg,#111827_0%,#0f172a_100%)] px-5 py-5 text-white">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-100/55">
                Revenue Operations
              </p>
              <p className="mt-2 text-[1.9rem] font-semibold tracking-tight text-white">
                {artistSettledPercent.toFixed(1)}%
              </p>
              <p className="mt-2 max-w-xl text-sm leading-7 text-violet-100/72">
                Ti le quy artist da san sang doi soat sau khi tru di phan doanh thu con treo.
              </p>
            </div>

            <StatusBadge status={period?.status} />
          </div>

          <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#8b5cf6_0%,#c084fc_100%)]"
              style={{
                width: `${Math.max(0, Math.min(artistSettledPercent, 100))}%`,
              }}
            />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-violet-300/20 bg-white/5 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-100/55">
                Cap nhat gan nhat
              </p>
              <p className="mt-2 text-sm font-medium text-white">
                {formatDateTime(metadata?.lastUpdatedAt)}
              </p>
            </div>

            <div className="rounded-2xl border border-violet-300/20 bg-white/5 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-100/55">
                Khoang thoi gian ky
              </p>
              <p className="mt-2 text-sm font-medium text-white">
                {formatDate(period?.periodStart)} - {formatDate(period?.periodEnd)}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-violet-300/20 bg-black/20 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-100/55">
                Quy artist da ghi nhan
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {formatCurrency(artistPool)}
              </p>
            </div>
            <div className="rounded-2xl border border-violet-300/20 bg-black/20 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-100/55">
                Doanh thu nen tang
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {formatCurrency(platformRevenue)}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {operationalCards.map((item) => (
            <div
              key={item.label}
              className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-500/70">
                    {item.label}
                  </p>
                  <p className="text-[1.75rem] font-semibold tracking-tight text-slate-950">
                    {item.value}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                  {item.icon}
                </div>
              </div>
              <p className="mt-4 border-t border-slate-100 pt-4 text-sm leading-6 text-slate-500">
                {item.helper}
              </p>
            </div>
          ))}

          <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-slate-700">
              <CalendarRange size={16} />
              <p className="text-sm font-semibold">Diem nhanh ve ky doanh thu</p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Premium revenue
                </p>
                <p className="mt-2 text-base font-semibold text-slate-950">
                  {formatCurrency(premiumRevenue)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Trang thai ky
                </p>
                <div className="mt-2">
                  <StatusBadge status={period?.status} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
};

export default RevenueCashflowSection;
