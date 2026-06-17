import { useState } from "react";
import { AlertCircle, LoaderCircle } from "lucide-react";
import RevenueCashflowSection from "./components/RevenueCashflowSection";
import RevenueComparisonSection from "./components/RevenueComparisonSection";
import RevenueHeroSection from "./components/RevenueHeroSection";
import RevenueInsightsSection from "./components/RevenueInsightsSection";
import RevenueMetricsGrid from "./components/RevenueMetricsGrid";
import RevenueSplitSection from "./components/RevenueSplitSection";
import { DashboardCard } from "./components/RevenueShared";
import useRevenueDashboard from "./useRevenueDashboard";
import { MONTH_LABELS } from "./constants";

const RevenueManagementPage = () => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const {
    dashboard,
    previousDashboard,
    isLoading,
    isRefreshing,
    error,
    handleRefresh,
  } = useRevenueDashboard(selectedYear, selectedMonth);

  const summary = dashboard?.summary || {};
  const metadata = dashboard?.metadata || {};
  const period = dashboard?.period || {};
  const previousSummary = previousDashboard?.summary || {};
  const previousPeriodLabel = previousDashboard?.period
    ? `${MONTH_LABELS[(previousDashboard.period.month || 1) - 1]} ${previousDashboard.period.year}`
    : "Ky truoc";

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(13,148,136,0.08),_transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eefbf6_100%)] p-4 text-slate-900 lg:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <RevenueHeroSection
          currentYear={currentYear}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          setSelectedYear={setSelectedYear}
          setSelectedMonth={setSelectedMonth}
          period={period}
          metadata={metadata}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
        />

        {error ? (
          <div className="flex items-start gap-3 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700">
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
                  Dang tai bang dieu khien doanh thu...
                </span>
              </div>
            </div>
          </DashboardCard>
        ) : (
          <>
            <RevenueMetricsGrid
              summary={summary}
              previousSummary={previousSummary}
              previousPeriodLabel={previousPeriodLabel}
              metadata={metadata}
            />

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <RevenueSplitSection summary={summary} />
              <RevenueCashflowSection summary={summary} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <RevenueInsightsSection dashboard={dashboard} />
              <RevenueComparisonSection
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
                summary={summary}
                previousDashboard={previousDashboard}
                previousSummary={previousSummary}
              />
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default RevenueManagementPage;
