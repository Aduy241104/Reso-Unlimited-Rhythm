import { Check, CreditCard, TrendingUp, X } from "lucide-react";

const HeaderStat = ({ label, value, icon: Icon }) => (
  <div className="flex min-w-[140px] items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-center sm:text-left">
    {Icon ? <Icon size={18} className="text-slate-400" /> : null}
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-0.5 text-base font-bold text-slate-900">{value}</p>
    </div>
  </div>
);

const SubscriptionManagementStatsSection = ({ stats }) => {
  const totalUserSubscriptions = stats?.totalSubscriptions ?? 0;
  const activeSubscriptions = stats?.byStatus?.active ?? 0;
  const expiredSubscriptions = stats?.byStatus?.expired ?? 0;
  const pendingSubscriptions = stats?.byStatus?.pending ?? 0;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <HeaderStat
        label="Tổng lượt đăng ký"
        value={totalUserSubscriptions}
        icon={CreditCard}
      />
      <HeaderStat
        label="Đang hoạt động"
        value={activeSubscriptions}
        icon={Check}
      />
      <HeaderStat
        label="Đã hết hạn"
        value={expiredSubscriptions}
        icon={X}
      />
      <HeaderStat
        label="Đang chờ"
        value={pendingSubscriptions}
        icon={TrendingUp}
      />
    </div>
  );
};

export default SubscriptionManagementStatsSection;
