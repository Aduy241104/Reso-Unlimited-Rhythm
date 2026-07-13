import { useEffect, useRef } from "react";
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
    size: 11,
    weight: "600",
  },
};

const ChartShell = ({ eyebrow, title, description, children, className = "" }) => (
  <div className={`rounded-[24px] border p-4 ${className}`}>
    <div className="mb-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {eyebrow}
      </p>
      <h3 className="mt-1 text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
    </div>
    {children}
  </div>
);

const RevenueOverviewCharts = ({ charts }) => {
  const monthlyRef = useRef(null);
  const dailyRef = useRef(null);
  const monthlyChartRef = useRef(null);
  const dailyChartRef = useRef(null);

  const monthlyData = Array.isArray(charts?.monthly) ? charts.monthly : [];
  const dailyData = Array.isArray(charts?.last14Days) ? charts.last14Days : [];
  const hasChartData = monthlyData.length > 0 || dailyData.length > 0;

  useEffect(() => {
    if (!monthlyRef.current || !dailyRef.current || !hasChartData) {
      return undefined;
    }

    destroyChartInstance(monthlyChartRef, monthlyRef.current);
    destroyChartInstance(dailyChartRef, dailyRef.current);

    monthlyChartRef.current = new Chart(monthlyRef.current, {
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
            tension: 0.35,
            borderWidth: 3,
            pointRadius: 3,
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
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 2,
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
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 2,
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
            position: "bottom",
            labels: {
              usePointStyle: true,
              pointStyle: "circle",
              boxWidth: 10,
              color: "#334155",
              padding: 18,
            },
          },
          tooltip: {
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
            ticks: baseTickStyle,
          },
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(148,163,184,0.18)",
              drawBorder: false,
            },
            ticks: {
              ...baseTickStyle,
              callback: (value) => formatCompactCurrency(value),
            },
          },
        },
      },
    });

    dailyChartRef.current = new Chart(dailyRef.current, {
      type: "line",
      data: {
        labels: dailyData.map((item) => item.label),
        datasets: [
          {
            label: "Doanh thu premium theo ngày",
            data: dailyData.map((item) => Number(item.premiumRevenue || 0)),
            borderColor: "#9333ea",
            backgroundColor: (context) =>
              buildGradient(context, ["rgba(147,51,234,0.22)", "rgba(147,51,234,0.02)"]),
            fill: true,
            tension: 0.35,
            borderWidth: 3,
            pointRadius: 3,
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
            backgroundColor: "rgba(245,158,11,0.06)",
            fill: false,
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 2,
            pointHoverRadius: 4,
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
            position: "bottom",
            labels: {
              usePointStyle: true,
              pointStyle: "circle",
              boxWidth: 10,
              color: "#334155",
              padding: 18,
            },
          },
          tooltip: {
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
            ticks: baseTickStyle,
          },
          revenue: {
            type: "linear",
            position: "left",
            beginAtZero: true,
            grid: {
              color: "rgba(148,163,184,0.18)",
              drawBorder: false,
            },
            ticks: {
              ...baseTickStyle,
              callback: (value) => formatCompactCurrency(value),
            },
          },
          transactions: {
            type: "linear",
            position: "right",
            beginAtZero: true,
            grid: {
              display: false,
              drawBorder: false,
            },
            ticks: {
              ...baseTickStyle,
              callback: (value) => formatNumber(value),
            },
          },
        },
      },
    });

    return () => {
      destroyChartInstance(monthlyChartRef, monthlyRef.current);
      destroyChartInstance(dailyChartRef, dailyRef.current);
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
    <DashboardCard className="border-slate-200">
      <div className="border-b border-slate-200 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Biểu đồ doanh thu
        </p>
        <h2 className="mt-1 text-lg font-semibold text-slate-950">
          Xu hướng theo tháng và 14 ngày gần nhất
        </h2>
      </div>

      <div className="grid gap-4 p-5">
        <ChartShell
          eyebrow="Theo tháng"
          title="Doanh thu premium, quỹ nghệ sĩ và doanh thu nền tảng"
          description="Giúp theo dõi tỷ trọng doanh thu giữa nghệ sĩ và nền tảng qua các kỳ gần đây."
          className="border-sky-200/70 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]"
        >
          <div className="h-[280px]">
            <canvas ref={monthlyRef} />
          </div>
        </ChartShell>

        <ChartShell
          eyebrow="14 ngày gần nhất"
          title="Biến động doanh thu và giao dịch"
          description="So sánh nhịp tăng giảm doanh thu premium theo ngày với số giao dịch thành công."
          className="border-slate-200 bg-slate-50"
        >
          <div className="h-[260px]">
            <canvas ref={dailyRef} />
          </div>
        </ChartShell>
      </div>
    </DashboardCard>
  );
};

export default RevenueOverviewCharts;
