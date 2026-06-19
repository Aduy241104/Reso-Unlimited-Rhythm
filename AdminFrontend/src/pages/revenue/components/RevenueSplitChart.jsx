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

  if (!chartArea) return colors[0];

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

const RevenueSplitChart = ({ charts }) => {
  const monthlyRef = useRef(null);
  const dailyRef = useRef(null);
  const monthlyChartRef = useRef(null);
  const dailyChartRef = useRef(null);

  const monthlyData = Array.isArray(charts?.monthly) ? charts.monthly : [];
  const dailyData = Array.isArray(charts?.last14Days) ? charts.last14Days : [];

  useEffect(() => {
    if (!monthlyRef.current || !dailyRef.current) return undefined;

    destroyChartInstance(monthlyChartRef, monthlyRef.current);
    destroyChartInstance(dailyChartRef, dailyRef.current);

    try {
      monthlyChartRef.current = new Chart(monthlyRef.current, {
        type: "line",
        data: {
          labels: monthlyData.map((item) => item.label),
          datasets: [
            {
              label: "Premium Revenue",
              data: monthlyData.map((item) => Number(item.premiumRevenue || 0)),
              borderColor: "#7c3aed",
              backgroundColor: (context) =>
                buildGradient(context, ["rgba(124,58,237,0.32)", "rgba(124,58,237,0.02)"]),
              fill: true,
              tension: 0.35,
              borderWidth: 3,
              pointRadius: 3,
              pointHoverRadius: 5,
              pointBackgroundColor: "#7c3aed",
              pointBorderColor: "#ffffff",
              pointBorderWidth: 2,
            },
            {
              label: "Artist Pool",
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
              label: "Platform Revenue",
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
              label: "Premium Revenue / Day",
              data: dailyData.map((item) => Number(item.premiumRevenue || 0)),
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
              yAxisID: "revenue",
            },
            {
              label: "Transactions",
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
    } catch (error) {
      destroyChartInstance(monthlyChartRef, monthlyRef.current);
      destroyChartInstance(dailyChartRef, dailyRef.current);
      throw error;
    }

    return () => {
      destroyChartInstance(monthlyChartRef, monthlyRef.current);
      destroyChartInstance(dailyChartRef, dailyRef.current);
    };
  }, [dailyData, monthlyData]);

  return (
    <div className="grid gap-4">
      <div className="rounded-[24px] border border-violet-200/60 bg-white p-4">
        <div className="mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-500/70">
            Monthly Trend
          </p>
          <h3 className="mt-1 text-lg font-semibold text-slate-950">
            Revenue trend theo thang
          </h3>
        </div>
        <div className="h-[280px]">
          <canvas ref={monthlyRef} />
        </div>
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
        <div className="mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Last 14 Days
          </p>
          <h3 className="mt-1 text-lg font-semibold text-slate-950">
            Bien dong 14 ngay gan nhat
          </h3>
        </div>
        <div className="h-[260px]">
          <canvas ref={dailyRef} />
        </div>
      </div>
    </div>
  );
};

export default RevenueSplitChart;
