import { useMemo, useRef, useState } from "react";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { LoaderCircle } from "lucide-react";
import { Line } from "react-chartjs-2";
import { displayRawValue, formatNumber, getVisibleDateStep } from "../helpers";

const GRID_LINE_COUNT = 4;
const MIN_POINT_GAP = 46;
const MIN_CHART_WIDTH = 560;
const MAX_CHART_WIDTH = 760;
const TOOLTIP_WIDTH = 190;
const TOOLTIP_HEIGHT_OFFSET = 18;

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip
);

const TrackInsightsChartPanel = ({
  chartIsEmpty,
  chartMeta,
  chartMetric,
  embedded = false,
  emptyDescription = "Khi du lieu bat dau duoc ghi nhan, bieu do se hien thi tai day.",
  emptyTitle = "Chua co du lieu trong giai doan nay",
  items,
  isAnalyticsLoading,
  latestMetricValue,
  maxMetricValue,
  metricOptions,
  onChangeMetric,
  sectionDescription = "Chon chi so can theo doi de xem bien dong du lieu.",
  sectionEyebrow = "Xu huong",
  sectionTitle = "Bieu do hieu suat",
  showTooltipListenValue = true,
  tooltipLabelFormatter = (value) => value,
  tooltipListenLabel = "luot nghe",
  tooltipListenValueKey = "playCount",
  tooltipMetricValueKey,
  xAxisLabelFormatter = (value) => value,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const chartContainerRef = useRef(null);
  const Wrapper = embedded ? "div" : "section";

  const chartId = `${sectionEyebrow}-${chartMetric}`
    .toLowerCase()
    .replace(/\s+/g, "-");

  const chartData = useMemo(
    () =>
      items.map((item) => {
        const rawMetricValue = item?.[tooltipMetricValueKey || chartMetric];

        return {
          label: item?.date || item?.month || "",
          listenValue: Number(item?.[tooltipListenValueKey] || 0),
          numericValue: Number(rawMetricValue) || 0,
          rawMetricValue,
        };
      }),
    [chartMetric, items, tooltipListenValueKey, tooltipMetricValueKey]
  );

  const lineChartData = useMemo(
    () => ({
      labels: chartData.map((point) => point.label),
      datasets: [
        {
          data: chartData.map((point) => point.numericValue),
          borderColor: chartMeta?.color,
          borderWidth: 3,
          tension: 0.35,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: chartMeta?.color,
          pointHoverBackgroundColor: chartMeta?.color,
          pointBorderColor: "#ffffff",
          pointHoverBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointHoverBorderWidth: 3,
          backgroundColor: (context) => {
            const { chart } = context;
            const { chartArea, ctx } = chart;

            if (!chartArea) {
              return "rgba(124, 108, 242, 0.08)";
            }

            const gradient = ctx.createLinearGradient(
              0,
              chartArea.top,
              0,
              chartArea.bottom
            );

            gradient.addColorStop(0, `${chartMeta?.color}3d`);
            gradient.addColorStop(1, `${chartMeta?.color}08`);

            return gradient;
          },
        },
      ],
    }),
    [chartData, chartMeta?.color]
  );

  const chartWidth = useMemo(() => {
    if (chartData.length <= 1) {
      return MIN_CHART_WIDTH;
    }

    return Math.min(
      MAX_CHART_WIDTH,
      Math.max(MIN_CHART_WIDTH, chartData.length * MIN_POINT_GAP)
    );
  }, [chartData.length]);

  const chartOptions = useMemo(() => {
    const visibleStep = getVisibleDateStep(chartData.length);

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: false,
          external: ({ chart, tooltip }) => {
            if (!chartContainerRef.current || tooltip.opacity === 0) {
              setHoveredPoint(null);
              return;
            }

            const tooltipPoint = tooltip.dataPoints?.[0];

            if (!tooltipPoint) {
              setHoveredPoint(null);
              return;
            }

            const chartBounds = chart.canvas.getBoundingClientRect();
            const containerBounds =
              chartContainerRef.current.getBoundingClientRect();
            const point = chartData[tooltipPoint.dataIndex];

            if (!point) {
              setHoveredPoint(null);
              return;
            }

            const rawX =
              tooltip.caretX + (chartBounds.left - containerBounds.left);
            const clampedX = Math.min(
              Math.max(rawX, TOOLTIP_WIDTH / 2 + 8),
              chartContainerRef.current.clientWidth - TOOLTIP_WIDTH / 2 - 8
            );
            const rawY =
              tooltip.caretY + (chartBounds.top - containerBounds.top);

            setHoveredPoint({
              label: point.label,
              listenValue: point.listenValue,
              metricValue: point.rawMetricValue,
              x: clampedX,
              y: Math.max(rawY, TOOLTIP_HEIGHT_OFFSET),
            });
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
            drawBorder: false,
          },
          border: {
            display: false,
          },
          ticks: {
            autoSkip: false,
            color: "#9a93b8",
            font: {
              size: 11,
              weight: 600,
            },
            maxRotation: 0,
            callback: (_, index) => {
              if (chartData.length <= 1) {
                return xAxisLabelFormatter(chartData[index]?.label);
              }

              return index === 0 ||
                index === chartData.length - 1 ||
                index % visibleStep === 0
                ? xAxisLabelFormatter(chartData[index]?.label)
                : "";
            },
          },
        },
        y: {
          beginAtZero: true,
          suggestedMax: Math.max(maxMetricValue, 1),
          ticks: {
            count: GRID_LINE_COUNT + 1,
            color: "#9a93b8",
            font: {
              size: 11,
            },
            callback: (value) =>
              chartMetric === "averageListenDuration"
                ? displayRawValue(Math.round(Number(value) || 0))
                : chartMeta?.formatter(value),
          },
          grid: {
            color: "rgba(36,27,21,0.08)",
            borderDash: [4, 8],
            drawBorder: false,
          },
          border: {
            display: false,
          },
        },
      },
    };
  }, [
    chartData,
    chartMeta,
    chartMetric,
    maxMetricValue,
    xAxisLabelFormatter,
  ]);

  if (!chartMeta || !metricOptions) {
    return null;
  }

  return (
    <Wrapper
      className={
        embedded
          ? ""
          : "rounded-[18px] border border-[#e7e1ff] bg-white p-4 shadow-sm"
      }
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#7c6cf2]">
            {sectionEyebrow}
          </p>
          <h3 className="mt-2 text-xl font-semibold text-[#2f2747]">
            {sectionTitle}
          </h3>
          <p className="mt-2 text-[13px] leading-5 text-[#7c7891]">
            {sectionDescription}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {Object.entries(metricOptions).map(([metricKey, metric]) => (
            <button
              key={metricKey}
              type="button"
              onClick={() => onChangeMetric(metricKey)}
              className={[
                "rounded-full border px-3.5 py-2 text-sm font-medium transition",
                chartMetric === metricKey
                  ? "border-[#6f5cf1] bg-[#6f5cf1] text-white"
                  : "border-[#e7e1ff] bg-[#f8f6ff] text-[#645d86] hover:border-[#b7abff] hover:text-[#2f2747]",
              ].join(" ")}
            >
              {metric.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className={[
          "rounded-[16px] border border-[#e7e1ff] bg-[#f8f6ff] p-3.5 sm:p-4",
          embedded ? "mt-4" : "mt-5",
        ].join(" ")}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[#2f2747]">{chartMeta.label}</p>
            <p className="mt-1 text-sm text-[#7c7891]">{chartMeta.description}</p>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div>
              <p className="text-[#7c7891]">Dinh cao nhat</p>
              <p className="mt-1 font-semibold text-[#2f2747]">
                {chartMeta.formatter(maxMetricValue)}
              </p>
            </div>
            <div>
              <p className="text-[#7c7891]">Moc gan nhat</p>
              <p className="mt-1 font-semibold text-[#2f2747]">
                {chartMetric === "averageListenDuration"
                  ? displayRawValue(latestMetricValue)
                  : chartMeta.formatter(latestMetricValue)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5">
          {isAnalyticsLoading ? (
            <div className="flex h-[320px] items-center justify-center rounded-[20px] border border-dashed border-neutral-200 bg-white text-sm text-neutral-500">
              <div className="flex items-center gap-3">
                <LoaderCircle className="h-5 w-5 animate-spin text-[#8b5e3c]" />
                Dang tai bieu do phan tich...
              </div>
            </div>
          ) : chartIsEmpty ? (
            <div className="flex h-[320px] flex-col items-center justify-center rounded-[20px] border border-dashed border-neutral-200 bg-white px-6 text-center">
              <p className="text-base font-semibold text-[#2f2747]">{emptyTitle}</p>
              <p className="mt-2 max-w-md text-sm leading-6 text-[#7c7891]">
                {emptyDescription}
              </p>
            </div>
          ) : (
            <div
              ref={chartContainerRef}
              className="relative overflow-visible rounded-[20px] bg-white p-3"
              onMouseLeave={() => setHoveredPoint(null)}
            >
              {hoveredPoint ? (
                <div
                  className="pointer-events-none absolute z-20 w-[190px] -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-2xl border border-[#e7e1ff] bg-white px-3 py-2 text-left shadow-lg shadow-[#7c6cf2]/10"
                  style={{
                    left: hoveredPoint.x,
                    top: hoveredPoint.y,
                  }}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7c6cf2]">
                    {tooltipLabelFormatter(hoveredPoint.label)}
                  </p>
                  {showTooltipListenValue ? (
                    <p className="mt-1 text-sm font-semibold text-[#2f2747]">
                      {formatNumber(hoveredPoint.listenValue)} {tooltipListenLabel}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-[#7c7891]">
                    {chartMeta.label}:{" "}
                    {chartMetric === "averageListenDuration"
                      ? displayRawValue(hoveredPoint.metricValue)
                      : chartMeta.formatter(hoveredPoint.metricValue)}
                  </p>
                </div>
              ) : null}

              <div className="overflow-x-auto overflow-y-visible">
                <div
                  style={{ minWidth: `${chartWidth}px` }}
                  role="img"
                  aria-labelledby={`chart-title-${chartId}`}
                >
                  <p id={`chart-title-${chartId}`} className="sr-only">
                    {sectionTitle}
                  </p>
                  <div className="h-[320px] w-full">
                    <Line data={lineChartData} options={chartOptions} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Wrapper>
  );
};

export default TrackInsightsChartPanel;
