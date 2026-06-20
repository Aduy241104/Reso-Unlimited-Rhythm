import { useEffect, useState } from "react";
import { ArrowRight, CalendarRange, LoaderCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { routePaths } from "../../routes/routePaths";
import { getRevenueDashboardService } from "../../services/revenueService";
import { DashboardCard, SectionHeader, StatusBadge } from "./components/RevenueShared";
import {
  buildRecentRevenuePeriods,
  formatCurrency,
  formatDateTime,
  formatNumber,
  formatPeriodLabel,
  getErrorMessage,
} from "./utils";

const RevenueHistoryPage = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [historyItems, setHistoryItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    const loadHistory = async () => {
      setIsLoading(true);
      setError("");

      try {
        const periods = buildRecentRevenuePeriods(
          12,
          currentYear,
          currentMonth
        );
        const snapshots = await Promise.all(
          periods.map((period) =>
            getRevenueDashboardService({
              year: period.year,
              month: period.month,
            })
          )
        );

        if (!isActive) return;

        setHistoryItems(
          snapshots.map((snapshot, index) => ({
            ...snapshot,
            year: periods[index].year,
            month: periods[index].month,
          }))
        );
      } catch (apiError) {
        if (!isActive) return;
        setError(getErrorMessage(apiError));
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadHistory();

    return () => {
      isActive = false;
    };
  }, [currentMonth, currentYear]);

  return (
    <section className="-mt-2 bg-[linear-gradient(180deg,#fdfdfe_0%,#f5f5f7_100%)] py-1">
      <div className="mx-auto max-w-7xl space-y-4">
        <DashboardCard className="border-violet-200/60 bg-[linear-gradient(135deg,#ffffff_0%,#fcfbff_58%,#f7f4ff_100%)] px-5 py-5 lg:px-6 lg:py-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700">
              <CalendarRange size={14} />
              Lịch sử doanh thu
            </div>
            <h1 className="text-[1.9rem] font-semibold tracking-tight text-slate-950">
              Xem chi tiết doanh thu các tháng trước
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-600">
              Mỗi dòng thể hiện một kỳ doanh thu đã có dữ liệu. Chọn một tháng để
              xem đầy đủ doanh thu premium, phân bổ cho nghệ sĩ, dòng tiền và trạng thái đối soát.
            </p>
          </div>
        </DashboardCard>

        <DashboardCard>
          <SectionHeader
            eyebrow="History"
            title="12 tháng gần nhất"
            description="Dữ liệu được đọc trực tiếp từ API doanh thu của backend cho từng tháng."
          />

          {isLoading ? (
            <div className="flex min-h-[280px] items-center justify-center px-5 py-10 text-slate-500">
              <div className="flex items-center gap-3">
                <LoaderCircle size={22} className="animate-spin" />
                <span className="text-sm font-medium">Đang tải lịch sử doanh thu...</span>
              </div>
            </div>
          ) : error ? (
            <div className="px-5 py-5 text-sm text-rose-700">{error}</div>
          ) : (
            <div className="grid gap-px bg-violet-200/50">
              {historyItems.map((item) => (
                <div
                  key={`${item.year}-${item.month}`}
                  className="grid gap-4 bg-white px-5 py-5 lg:grid-cols-[1.15fr_0.7fr_0.8fr_0.8fr_0.6fr_auto] lg:items-center"
                >
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-slate-950">
                      {formatPeriodLabel(item.year, item.month)}
                    </p>
                    <p className="text-sm text-slate-500">
                      Cập nhật: {formatDateTime(item.metadata?.lastUpdatedAt)}
                    </p>
                  </div>

                  <div>
                    <StatusBadge status={item.period?.status} />
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-500/70">
                      Premium
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {formatCurrency(item.summary?.premiumRevenue)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-500/70">
                      Quỹ nghệ sĩ
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {formatCurrency(item.summary?.artistPool)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-500/70">
                      Giao dịch
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {formatNumber(item.summary?.successfulTransactions)}
                    </p>
                  </div>

                  <div>
                    <Link
                      to={routePaths.revenuePeriodDetail(item.year, item.month)}
                      className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
                    >
                      Xem chi tiết
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>
      </div>
    </section>
  );
};

export default RevenueHistoryPage;
