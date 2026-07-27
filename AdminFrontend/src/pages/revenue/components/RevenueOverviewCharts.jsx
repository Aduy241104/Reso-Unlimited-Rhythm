import { useEffect, useRef } from "react";
import { Activity, CalendarDays, TrendingUp } from "lucide-react";
import {
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { DashboardCard } from "./RevenueShared";
import { formatCompactCurrency, formatCurrency, formatNumber } from "../utils";

Chart.register(
  CategoryScale,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
);

const EMPTY_CHART_DATA = [];

const destroyChartInstance = (chartRef, canvas) => {
  if (chartRef.current) {
    chartRef.current.destroy();
    chartRef.current = null;
  }

  const existingChart = canvas ? Chart.getChart(canvas) : null;
  if (existingChart) {
    existingChart.destroy();
  }
};

const buildGradient = (context, colors) => {
  const { chart } = context;
  const { ctx, chartArea } = chart;

  if (!chartArea) {
    return colors[0];
  }

  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(1, colors[1]);
  return gradient;
};

const baseTickStyle = {
  color: "#64748b",
  font: {
    size: 10,
    weight: "500",
  },
  padding: 10,
};

const tooltipOptions = {
  backgroundColor: "rgba(15, 23, 42, 0.96)",
  titleColor: "#f8fafc",
  bodyColor: "#e2e8f0",
  borderColor: "rgba(148, 163, 184, 0.22)",
  borderWidth: 1,
  cornerRadius: 12,
  padding: 12,
  boxPadding: 5,
  usePointStyle: true,
  titleFont: { size: 12, weight: "600" },
  bodyFont: { size: 12, weight: "500" },
};

const legendOptions = {
  position: "top",
  align: "end",
  labels: {
    usePointStyle: true,
    pointStyle: "circle",
    boxWidth: 7,
    boxHeight: 7,
    color: "#475569",
    padding: 16,
    font: { size: 11, weight: "600" },
  },
};

const getPercentChange = (currentValue, previousValue) => {
  const current = Number(currentValue || 0);
  const previous = Number(previousValue || 0);

  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }

  return ((current - previous) / previous) * 100;
};

const formatPercentChange = (value) => {
  const normalizedValue = Number(value || 0);
  const prefix = normalizedValue > 0 ? "+" : "";
  return `${prefix}${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 1,
  }).format(normalizedValue)}%`;
};

const ChartShell = ({
  eyebrow,
  title,
  description,
  icon,
  iconClassName,
  metrics,
  children,
  className = "",
}) => (
  <article
    className={`relative isolate overflow-hidden rounded-xl border p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] ${className}`}
  >
    <div className="pointer-events-none absolute -right-16 -top-20 -z-10 h-52 w-52 rounded-full bg-white/70 blur-3xl" />

    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3.5">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg shadow-sm ${iconClassName}`}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            {eyebrow}
          </p>
          <h3 className="mt-1.5 text-[17px] font-bold tracking-tight text-slate-950">
            {title}
          </h3>
          <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-2">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-lg border border-white/80 bg-white/75 px-3 py-2.5 shadow-sm backdrop-blur"
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
              {metric.label}
            </p>
            <p className={`mt-1 text-sm font-bold ${metric.valueClassName || "text-slate-900"}`}>
              {metric.value}
            </p>
          </div>
        ))}
      </div>
    </div>

    <div className="mt-4 rounded-lg border border-white/90 bg-white/80 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-sm sm:p-3">
      {children}
    </div>
  </article>
);

const RevenueOverviewCharts = ({ charts }) => {
  const monthlyRef = useRef(null);
  const dailyRef = useRef(null);
  const monthlyChartRef = useRef(null);
  const dailyChartRef = useRef(null);

  const monthlyData = Array.isArray(charts?.monthly)
    ? charts.monthly
    : EMPTY_CHART_DATA;
  const dailyData = Array.isArray(charts?.last14Days)
    ? charts.last14Days
    : EMPTY_CHART_DATA;
  const hasChartData = monthlyData.length > 0 || dailyData.length > 0;
  const latestMonth = monthlyData.at(-1);
  const previousMonth = monthlyData.at(-2);
  const monthlyChange = getPercentChange(
    latestMonth?.premiumRevenue,
    previousMonth?.premiumRevenue
  );
  const dailyRevenueTotal = dailyData.reduce(
    (total, item) => total + Number(item.premiumRevenue || 0),
    0
  );
  const dailyTransactionTotal = dailyData.reduce(
    (total, item) => total + Number(item.successfulTransactions || 0),
    0
  );

  useEffect(() => {
    const monthlyCanvas = monthlyRef.current;
    const dailyCanvas = dailyRef.current;

    if (!monthlyCanvas || !dailyCanvas || !hasChartData) {
      return undefined;
    }

    destroyChartInstance(monthlyChartRef, monthlyCanvas);
    destroyChartInstance(dailyChartRef, dailyCanvas);

    monthlyChartRef.current = new Chart(monthlyCanvas, {
      type: "line",
      data: {
        labels: monthlyData.map((item) => item.label),
        datasets: [
          {
            label: "Doanh thu premium",
            data: monthlyData.map((item) => Number(item.premiumRevenue || 0)),
            borderColor: "#2563eb",
            backgroundColor: (context) =>
              buildGradient(context, ["rgba(37,99,235,0.28)", "rgba(37,99,235,0.02)"]),
            fill: true,
            tension: 0.4,
            borderWidth: 2.5,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointBackgroundColor: "#2563eb",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
          },
          {
            label: "Quỹ nghệ sĩ",
            data: monthlyData.map((item) => Number(item.artistPool || 0)),
            borderColor: "#0f766e",
            backgroundColor: "rgba(15,118,110,0.08)",
            fill: false,
            tension: 0.4,
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            pointHoverRadius: 4,
            pointBackgroundColor: "#0f766e",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
          },
          {
            label: "Doanh thu nền tảng",
            data: monthlyData.map((item) => Number(item.platformRevenue || 0)),
            borderColor: "#0f172a",
            backgroundColor: "rgba(15,23,42,0.06)",
            fill: false,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointBackgroundColor: "#0f172a",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          legend: {
            ...legendOptions,
          },
          tooltip: {
            ...tooltipOptions,
            callbacks: {
              label: (context) =>
                `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`,
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            border: { display: false },
            ticks: baseTickStyle,
          },
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(148,163,184,0.14)",
              drawTicks: false,
            },
            border: { display: false },
            ticks: {
              ...baseTickStyle,
              maxTicksLimit: 5,
              callback: (value) => formatCompactCurrency(value),
            },
          },
        },
      },
    });

    dailyChartRef.current = new Chart(dailyCanvas, {
      type: "line",
      data: {
        labels: dailyData.map((item) => item.label),
        datasets: [
          {
            label: "Doanh thu premium",
            data: dailyData.map((item) => Number(item.premiumRevenue || 0)),
            borderColor: "#9333ea",
            backgroundColor: (context) =>
              buildGradient(context, ["rgba(147,51,234,0.22)", "rgba(147,51,234,0.02)"]),
            fill: true,
            tension: 0.4,
            borderWidth: 2.5,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointBackgroundColor: "#9333ea",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
            yAxisID: "revenue",
          },
          {
            label: "Giao dịch thành công",
            data: dailyData.map((item) => Number(item.successfulTransactions || 0)),
            borderColor: "#f59e0b",
            backgroundColor: "rgba(245,158,11,0.08)",
            fill: false,
            tension: 0.4,
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            pointHoverRadius: 5,
            pointBackgroundColor: "#f59e0b",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
            yAxisID: "transactions",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          legend: {
            ...legendOptions,
          },
          tooltip: {
            ...tooltipOptions,
            callbacks: {
              label: (context) =>
                context.dataset.yAxisID === "transactions"
                  ? `${context.dataset.label}: ${formatNumber(context.parsed.y)}`
                  : `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`,
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            border: { display: false },
            ticks: baseTickStyle,
          },
          revenue: {
            type: "linear",
            position: "left",
            beginAtZero: true,
            grid: {
              color: "rgba(148,163,184,0.14)",
              drawTicks: false,
            },
            border: { display: false },
            ticks: {
              ...baseTickStyle,
              maxTicksLimit: 5,
              callback: (value) => formatCompactCurrency(value),
            },
          },
          transactions: {
            type: "linear",
            position: "right",
            beginAtZero: true,
            grid: {
              display: false,
            },
            border: { display: false },
            ticks: {
              ...baseTickStyle,
              maxTicksLimit: 5,
              callback: (value) => formatNumber(value),
            },
          },
        },
      },
    });

    return () => {
      destroyChartInstance(monthlyChartRef, monthlyCanvas);
      destroyChartInstance(dailyChartRef, dailyCanvas);
    };
  }, [dailyData, hasChartData, monthlyData]);

  if (!hasChartData) {
    return (
      <DashboardCard className="border-slate-200">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Biểu đồ doanh thu
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">
            Xu hướng doanh thu hiện tại
          </h2>
        </div>

        <div className="px-5 py-12 text-center">
          <p className="text-sm font-medium text-slate-600">
            Chưa có dữ liệu biểu đồ để hiển thị cho kỳ doanh thu này.
          </p>
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard className="!rounded-xl overflow-hidden border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] px-5 py-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-600">
            <TrendingUp size={14} />
            Phân tích doanh thu
          </div>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
            Toàn cảnh biến động doanh thu
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            So sánh hiệu quả theo kỳ và theo dõi nhịp giao dịch gần nhất.
          </p>
        </div>

        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
          Dữ liệu đã đồng bộ
        </span>
      </div>

      <div className="grid gap-5 p-5 xl:grid-cols-2">
        <ChartShell
          eyebrow="Theo tháng"
          title="Cơ cấu doanh thu qua các kỳ"
          description="Premium, quỹ nghệ sĩ và phần doanh thu nền tảng."
          icon={<CalendarDays size={19} />}
          iconClassName="bg-blue-600 text-white"
          metrics={[
            {
              label: "Kỳ gần nhất",
              value: `${formatCompactCurrency(latestMonth?.premiumRevenue)} ₫`,
            },
            {
              label: "Tăng trưởng",
              value: formatPercentChange(monthlyChange),
              valueClassName:
                monthlyChange >= 0 ? "text-emerald-600" : "text-rose-600",
            },
          ]}
          className="border-blue-100 bg-[linear-gradient(145deg,#eff6ff_0%,#f8fbff_46%,#eef2ff_100%)]"
        >
          <div className="h-[300px]">
            <canvas ref={monthlyRef} />
          </div>
        </ChartShell>

        <ChartShell
          eyebrow="14 ngày gần nhất"
          title="Biến động doanh thu và giao dịch"
          description="Theo dõi song song xu hướng doanh thu và giao dịch thành công mỗi ngày."
          icon={<Activity size={19} />}
          iconClassName="bg-violet-600 text-white"
          metrics={[
            {
              label: "Doanh thu",
              value: `${formatCompactCurrency(dailyRevenueTotal)} ₫`,
            },
            {
              label: "Giao dịch",
              value: formatNumber(dailyTransactionTotal),
              valueClassName: "text-amber-600",
            },
          ]}
          className="border-violet-100 bg-[linear-gradient(145deg,#faf5ff_0%,#fcfaff_48%,#fff7ed_100%)]"
        >
          <div className="h-[300px]">
            <canvas ref={dailyRef} />
          </div>
        </ChartShell>
      </div>
    </DashboardCard>
  );
};

export default RevenueOverviewCharts;
