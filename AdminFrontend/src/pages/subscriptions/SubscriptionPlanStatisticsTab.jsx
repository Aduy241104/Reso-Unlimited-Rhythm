import { useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { getPlanSubscriptionStatsService } from "../../services/subscriptionService";

const formatCurrency = (value) => {
  if (value === undefined || value === null) return "-";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
};

const getPlanStatusLabel = (status) => {
  if (status === "active") return "Hoạt động";
  if (status === "inactive") return "Ẩn";
  return status;
};

const SubscriptionPlanStatisticsTab = () => {
  const [planStats, setPlanStats] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadPlanStats = async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const data = await getPlanSubscriptionStatsService();
      setPlanStats(data);
    } catch (error) {
      setMessage("Không thể tải thống kê lượt đăng ký theo gói.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPlanStats();
  }, []);

  return (
    <section className="space-y-4">
      <div className="flex justify-end rounded-2xl bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <button
          type="button"
          onClick={() => void loadPlanStats()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <RefreshCcw size={14} />
          Tải lại
        </button>
      </div>

      {message ? (
        <div className="rounded-xl border border-red-100 bg-red-50/50 px-4 py-3 text-sm text-red-600">
          {message}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <div className="overflow-x-auto">
          <div className="min-w-[1150px]">
            <div className="grid grid-cols-[minmax(0,1.6fr)_140px_120px_120px_140px_140px_140px_120px] gap-4 border-b border-slate-200 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              <span>Gói đăng ký</span>
              <span>Giá</span>
              <span>Thời hạn</span>
              <span>Trạng thái</span>
              <span>Tổng lượt</span>
              <span>Hoạt động</span>
              <span>Hết hạn</span>
              <span>Đang chờ</span>
            </div>

            {isLoading ? (
              <div className="p-12 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
                Đang tải thống kê gói đăng ký...
              </div>
            ) : null}

            {!isLoading && planStats.length === 0 ? (
              <div className="p-12 text-center italic text-slate-400">
                Chưa có dữ liệu thống kê cho các gói đăng ký.
              </div>
            ) : null}

            {!isLoading
              ? planStats.map((item) => (
                  <div
                    key={item.planId}
                    className="grid grid-cols-[minmax(0,1.6fr)_140px_120px_120px_140px_140px_140px_120px] gap-4 border-b border-slate-100 px-6 py-4 text-sm text-slate-700 last:border-b-0"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{item.planName}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Đã hủy: {item.cancelledSubscriptions ?? 0}
                      </p>
                    </div>
                    <span>{formatCurrency(item.planPrice)}</span>
                    <span>{item.planDurationDays} ngày</span>
                    <span>{getPlanStatusLabel(item.planStatus)}</span>
                    <span className="font-semibold text-slate-900">
                      {item.totalSubscriptions ?? 0}
                    </span>
                    <span className="font-semibold text-emerald-600">
                      {item.activeSubscriptions ?? 0}
                    </span>
                    <span className="font-semibold text-amber-600">
                      {item.expiredSubscriptions ?? 0}
                    </span>
                    <span>{item.pendingSubscriptions ?? 0}</span>
                  </div>
                ))
              : null}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SubscriptionPlanStatisticsTab;
