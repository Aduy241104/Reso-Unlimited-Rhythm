import { AlertCircle, LoaderCircle } from "lucide-react";
import RevenueHeroSection from "./components/RevenueHeroSection";
import { DashboardCard } from "./components/RevenueShared";
import RevenueTrendSection from "./components/RevenueTrendSection";
import useRevenueDashboard from "./useRevenueDashboard";

const RevenueManagementPage = () => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  const { dashboard, isLoading, isRefreshing, error, handleRefresh } =
    useRevenueDashboard(currentYear, currentMonth);

  const summary = dashboard?.summary || {};
  const metadata = dashboard?.metadata || {};
  const charts = dashboard?.charts || {};
  const period = dashboard?.period || {
    year: currentYear,
    month: currentMonth,
  };

  return (
    <section className="-mt-2 bg-[linear-gradient(180deg,#fdfdfe_0%,#f5f5f7_100%)] py-1 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-4">
        <RevenueHeroSection
          period={period}
          metadata={metadata}
          summary={summary}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
        />

        {error ? (
          <div className="flex items-start gap-3 rounded-[18px] border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p className="text-sm leading-6">{error}</p>
          </div>
        ) : null}

        {isLoading ? (
          <DashboardCard className="p-10">
            <div className="flex min-h-[320px] items-center justify-center">
              <div className="flex items-center gap-3 text-slate-500">
                <LoaderCircle size={22} className="animate-spin" />
                <span className="text-sm font-medium">
                  Đang tải bảng điều khiển doanh thu...
                </span>
              </div>
            </div>
          </DashboardCard>
        ) : (
          <RevenueTrendSection
            summary={summary}
            metadata={metadata}
            charts={charts}
          />
        )}
      </div>
    </section>
  );
};

export default RevenueManagementPage;
