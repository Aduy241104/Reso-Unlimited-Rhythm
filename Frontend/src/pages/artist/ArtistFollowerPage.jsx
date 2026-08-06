import { CalendarDays, RefreshCcw, TrendingUp, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";
import ArtistFollowerEmpty from "../../components/artistfollower/ArtistFollowerEmpty";
import ArtistFollowerList from "../../components/artistfollower/ArtistFollowerList";
import ArtistFollowerPagination from "../../components/artistfollower/ArtistFollowerPagination";
import ArtistFollowerSkeleton, {
  ArtistFollowerChartSkeleton,
} from "../../components/artistfollower/ArtistFollowerSkeleton";
import { getArtistFollowers } from "../../services/artistFollowservice";
import { getApiErrorMessage } from "../../utils/apiError";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip
);

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const DEFAULT_PAGINATION = {
  page: DEFAULT_PAGE,
  limit: DEFAULT_LIMIT,
  totalItems: 0,
  totalPages: 0,
};

const CARD_STYLES =
  "rounded-[24px] border border-[#ebe6ff] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#181818] sm:p-6";
const DAILY_GROWTH_DAYS = 7;
const HO_CHI_MINH_TIMEZONE = "Asia/Ho_Chi_Minh";
const GRID_LINE_COUNT = 4;
const MIN_POINT_GAP = 46;
const MIN_CHART_WIDTH = 560;
const MAX_CHART_WIDTH = 760;
const TOOLTIP_WIDTH = 190;
const TOOLTIP_HEIGHT_OFFSET = 18;

const normalizePagination = (pagination = {}, fallbackPage = DEFAULT_PAGE) => ({
  page: Number(pagination?.page || fallbackPage),
  limit: Number(pagination?.limit || DEFAULT_LIMIT),
  totalItems: Number(pagination?.totalItems || 0),
  totalPages: Number(pagination?.totalPages || 0),
});

const getCurrentDateParts = () => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: HO_CHI_MINH_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const dateParts = formatter.formatToParts(new Date());
  const year = dateParts.find((part) => part.type === "year")?.value;
  const month = dateParts.find((part) => part.type === "month")?.value;
  const day = dateParts.find((part) => part.type === "day")?.value;

  return {
    date: `${year}-${month}-${day}`,
    month: `${year}-${month}`,
  };
};

const createUtcDateFromIso = (value) => {
  const [year, month, day] = String(value || "")
    .split("-")
    .map((part) => Number(part));

  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  return Number.isNaN(date.getTime()) ? null : date;
};

const formatUtcDateToIso = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const normalizeGrowthCount = (value) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const normalizedValue = Number(String(value ?? "").trim().replace(/,/g, ""));

  return Number.isFinite(normalizedValue) ? normalizedValue : 0;
};

const normalizeGrowthDateValue = (value) => {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return "";
  }

  const isoDateMatch = rawValue.match(/^(\d{4}-\d{2}-\d{2})/);

  if (isoDateMatch?.[1]) {
    return isoDateMatch[1];
  }

  const parsedDate = new Date(rawValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return formatUtcDateToIso(
    new Date(
      Date.UTC(
        parsedDate.getUTCFullYear(),
        parsedDate.getUTCMonth(),
        parsedDate.getUTCDate()
      )
    )
  );
};

const normalizeDailyGrowthItems = (items = []) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.reduce((result, item) => {
    const date = normalizeGrowthDateValue(item?.date);

    if (!date) {
      return result;
    }

    result.push({
      date,
      count: normalizeGrowthCount(item?.count),
    });

    return result;
  }, []);
};

const getGrowthCountByField = (items = [], field, expectedValue) => {
  if (!Array.isArray(items) || items.length === 0 || !field || !expectedValue) {
    return 0;
  }

  const matchedItem = items.find((item) => item?.[field] === expectedValue);

  return normalizeGrowthCount(matchedItem?.count);
};

const formatGrowthLabel = (value) => {
  const date = createUtcDateFromIso(value);

  if (!date) {
    return "--/--";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
};

const formatGrowthTooltipDate = (value) => {
  const date = createUtcDateFromIso(value);

  if (!date) {
    return "--/--/----";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const buildDailyGrowthChartData = (items = [], endDate) => {
  const endDateUtc = createUtcDateFromIso(endDate);

  if (!endDateUtc) {
    return [];
  }

  const normalizedItems = normalizeDailyGrowthItems(items);
  const growthMap = normalizedItems.reduce((map, item) => {
    map.set(item.date, normalizeGrowthCount(map.get(item.date)) + item.count);
    return map;
  }, new Map());

  return Array.from({ length: DAILY_GROWTH_DAYS }, (_, index) => {
    const date = new Date(endDateUtc);
    date.setUTCDate(endDateUtc.getUTCDate() - (DAILY_GROWTH_DAYS - index - 1));

    const isoDate = formatUtcDateToIso(date);

    return {
      date: isoDate,
      label: formatGrowthLabel(isoDate),
      count: normalizeGrowthCount(growthMap.get(isoDate)),
    };
  });
};

const formatMetricValue = (value) => normalizeGrowthCount(value).toLocaleString("vi-VN");

const getVisibleDateStep = (totalItems) => {
  if (totalItems <= 7) {
    return 1;
  }

  if (totalItems <= 14) {
    return 2;
  }

  if (totalItems <= 31) {
    return 5;
  }

  return Math.ceil(totalItems / 6);
};

const FOLLOWER_CHART_META = {
  label: "Ng\u01b0\u1eddi theo d\u00f5i m\u1edbi",
  color: "#6f5cf1",
  description: "S\u1ed1 ng\u01b0\u1eddi theo d\u00f5i m\u1edbi theo t\u1eebng ng\u00e0y",
  formatter: formatMetricValue,
};

const SummaryCard = ({ icon: Icon, label, value, helper, isLoading = false }) => {
  return (
    <div className="rounded-[20px] border border-[#efeaff] bg-white/80 p-4 backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[#7c7891] dark:text-[#a1a1aa]">{label}</p>
          {isLoading ? (
            <div className="mt-3 h-8 w-20 animate-pulse rounded-full bg-[#ece6ff] dark:bg-white/[0.08]" />
          ) : (
            <p className="mt-2 text-2xl font-semibold text-[#2f2747] dark:text-white">
              {value}
            </p>
          )}
          <p className="mt-2 text-xs leading-5 text-[#8a84a2] dark:text-[#8f8f98]">{helper}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f3efff] text-[#6f5cf1] dark:bg-white/[0.06] dark:text-[#d2cbff]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

const DailyGrowthChart = ({ data = [] }) => {
  const chartContainerRef = useRef(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const fallbackData = useMemo(
    () => buildDailyGrowthChartData([], getCurrentDateParts().date),
    []
  );
  const safeData = Array.isArray(data) && data.length > 0 ? data : fallbackData;
  const totalGrowth = safeData.reduce((sum, item) => sum + normalizeGrowthCount(item?.count), 0);
  const peakDay = safeData.reduce(
    (currentPeak, item) =>
      normalizeGrowthCount(item?.count) > normalizeGrowthCount(currentPeak?.count)
        ? item
        : currentPeak,
    safeData[0] || null
  );
  const latestPoint = safeData[safeData.length - 1] || null;
  const maxMetricValue = Math.max(
    ...safeData.map((item) => normalizeGrowthCount(item?.count)),
    0
  );

  const chartData = useMemo(
    () =>
      safeData.map((item) => ({
        label: item?.date || "",
        axisLabel: item?.label || formatGrowthLabel(item?.date),
        numericValue: normalizeGrowthCount(item?.count),
        rawMetricValue: normalizeGrowthCount(item?.count),
      })),
    [safeData]
  );

  const lineChartData = useMemo(
    () => ({
      labels: chartData.map((point) => point.label),
      datasets: [
        {
          data: chartData.map((point) => point.numericValue),
          borderColor: FOLLOWER_CHART_META.color,
          borderWidth: 3,
          tension: 0.35,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: FOLLOWER_CHART_META.color,
          pointHoverBackgroundColor: FOLLOWER_CHART_META.color,
          pointBorderColor: "#ffffff",
          pointHoverBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointHoverBorderWidth: 3,
          backgroundColor: (context) => {
            const { chart } = context;
            const { chartArea, ctx } = chart;

            if (!chartArea) {
              return "rgba(111, 92, 241, 0.08)";
            }

            const gradient = ctx.createLinearGradient(
              0,
              chartArea.top,
              0,
              chartArea.bottom
            );

            gradient.addColorStop(0, "rgba(111, 92, 241, 0.24)");
            gradient.addColorStop(1, "rgba(111, 92, 241, 0.03)");

            return gradient;
          },
        },
      ],
    }),
    [chartData]
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
            const containerBounds = chartContainerRef.current.getBoundingClientRect();
            const point = chartData[tooltipPoint.dataIndex];

            if (!point) {
              setHoveredPoint(null);
              return;
            }

            const rawX = tooltip.caretX + (chartBounds.left - containerBounds.left);
            const clampedX = Math.min(
              Math.max(rawX, TOOLTIP_WIDTH / 2 + 8),
              chartContainerRef.current.clientWidth - TOOLTIP_WIDTH / 2 - 8
            );
            const rawY = tooltip.caretY + (chartBounds.top - containerBounds.top);

            setHoveredPoint({
              label: point.label,
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
                return formatGrowthLabel(chartData[index]?.label);
              }

              return index === 0 ||
                index === chartData.length - 1 ||
                index % visibleStep === 0
                ? formatGrowthLabel(chartData[index]?.label)
                : "";
            },
          },
        },
        y: {
          beginAtZero: true,
          suggestedMax: Math.max(maxMetricValue, 1),
          ticks: {
            count: GRID_LINE_COUNT + 1,
            precision: 0,
            color: "#9a93b8",
            font: {
              size: 11,
            },
            callback: (value) => formatMetricValue(Math.round(Number(value) || 0)),
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
  }, [chartData, maxMetricValue]);

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#7c6cf2]">
            {"Xu h\u01b0\u1edbng theo ng\u00e0y"}
          </p>
          <h3 className="mt-2 text-xl font-semibold text-[#2f2747] dark:text-white">
            {"Bi\u1ec3u \u0111\u1ed3 t\u0103ng tr\u01b0\u1edfng ng\u01b0\u1eddi theo d\u00f5i"}
          </h3>
          <p className="mt-2 text-[13px] leading-5 text-[#7c7891] dark:text-[#a1a1aa]">
            {
              "Theo d\u00f5i s\u1ed1 ng\u01b0\u1eddi theo d\u00f5i m\u1edbi trong 7 ng\u00e0y g\u1ea7n nh\u1ea5t, bao g\u1ed3m c\u1ea3 nh\u1eefng ng\u00e0y ch\u01b0a ph\u00e1t sinh t\u0103ng tr\u01b0\u1edfng."
            }
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[280px]">
          <div className="rounded-[18px] border border-[#ebe6ff] bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-xs uppercase tracking-[0.16em] text-[#8a84a2] dark:text-[#8f8f98]">
              {"Cao nh\u1ea5t"}
            </p>
            <p className="mt-2 text-xl font-semibold text-[#2f2747] dark:text-white">
              {formatMetricValue(peakDay?.count || 0)}
            </p>
            <p className="mt-1 text-xs text-[#8a84a2] dark:text-[#8f8f98]">
              {peakDay?.label ? `Ng\u00e0y ${peakDay.label}` : "Ch\u01b0a c\u00f3 d\u1eef li\u1ec7u"}
            </p>
          </div>
          <div className="rounded-[18px] border border-[#ebe6ff] bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-xs uppercase tracking-[0.16em] text-[#8a84a2] dark:text-[#8f8f98]">
              {"M\u1ed1c g\u1ea7n nh\u1ea5t"}
            </p>
            <p className="mt-2 text-xl font-semibold text-[#2f2747] dark:text-white">
              {formatMetricValue(latestPoint?.count || 0)}
            </p>
            <p className="mt-1 text-xs text-[#8a84a2] dark:text-[#8f8f98]">
              {latestPoint?.label ? `Ng\u00e0y ${latestPoint.label}` : "Ch\u01b0a c\u00f3 d\u1eef li\u1ec7u"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[16px] border border-[#e7e1ff] bg-[#f8f6ff] p-3.5 sm:p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[#2f2747] dark:text-white">
              {FOLLOWER_CHART_META.label}
            </p>
            <p className="mt-1 text-sm text-[#7c7891] dark:text-[#a1a1aa]">
              {FOLLOWER_CHART_META.description}
            </p>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div>
              <p className="text-[#7c7891] dark:text-[#a1a1aa]">{"T\u1ed5ng 7 ng\u00e0y"}</p>
              <p className="mt-1 font-semibold text-[#2f2747] dark:text-white">
                {FOLLOWER_CHART_META.formatter(totalGrowth)}
              </p>
            </div>
            <div>
              <p className="text-[#7c7891] dark:text-[#a1a1aa]">{"M\u1ed1c g\u1ea7n nh\u1ea5t"}</p>
              <p className="mt-1 font-semibold text-[#2f2747] dark:text-white">
                {FOLLOWER_CHART_META.formatter(latestPoint?.count || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div
            ref={chartContainerRef}
            className="relative overflow-visible rounded-[20px] bg-white p-3 dark:bg-[#181818]"
            onMouseLeave={() => setHoveredPoint(null)}
          >
            {hoveredPoint ? (
              <div
                className="pointer-events-none absolute z-20 w-[190px] -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-2xl border border-[#e7e1ff] bg-white px-3 py-2 text-left shadow-lg shadow-[#7c6cf2]/10 dark:border-white/10 dark:bg-[#1f1f23]"
                style={{
                  left: hoveredPoint.x,
                  top: hoveredPoint.y,
                }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7c6cf2] dark:text-[#c4bbff]">
                  {formatGrowthTooltipDate(hoveredPoint.label)}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#2f2747] dark:text-white">
                  {formatMetricValue(hoveredPoint.metricValue)}
                </p>
                <p className="mt-1 text-xs text-[#7c7891] dark:text-[#a1a1aa]">
                  {`${FOLLOWER_CHART_META.label}: ${FOLLOWER_CHART_META.formatter(
                    hoveredPoint.metricValue
                  )}`}
                </p>
              </div>
            ) : null}

            <div className="overflow-x-auto overflow-y-visible">
              <div
                style={{ minWidth: `${chartWidth}px` }}
                role="img"
                aria-labelledby="chart-title-follower-growth"
              >
                <p id="chart-title-follower-growth" className="sr-only">
                  {"Bi\u1ec3u \u0111\u1ed3 t\u0103ng tr\u01b0\u1edfng ng\u01b0\u1eddi theo d\u00f5i"}
                </p>
                <div className="h-[320px] w-full min-w-0">
                  <Line data={lineChartData} options={chartOptions} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ArtistFollowerPage = () => {
  const [artist, setArtist] = useState(null);
  const [followers, setFollowers] = useState([]);
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [latestDailyGrowth, setLatestDailyGrowth] = useState(0);
  const [latestMonthlyGrowth, setLatestMonthlyGrowth] = useState(0);
  const [dailyGrowthChart, setDailyGrowthChart] = useState(() =>
    buildDailyGrowthChartData([], getCurrentDateParts().date)
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchFollowers = async () => {
      const currentDateParts = getCurrentDateParts();

      setIsLoading(true);
      setErrorMessage("");

      try {
        const payload = await getArtistFollowers({
          page,
          limit: DEFAULT_LIMIT,
        });

        if (!isMounted) {
          return;
        }

        const followersPayload = payload?.followers || {};
        const statisticsPayload = payload?.statistics || {};
        const normalizedDailyGrowth = normalizeDailyGrowthItems(
          statisticsPayload?.dailyGrowth
        );
        const nextFollowers = Array.isArray(followersPayload?.items)
          ? followersPayload.items
          : [];
        const nextPagination = normalizePagination(
          followersPayload?.pagination || DEFAULT_PAGINATION,
          page
        );

        setArtist(payload?.artist || null);
        setFollowers(nextFollowers);
        setPagination(nextPagination);
        setLatestDailyGrowth(
          getGrowthCountByField(normalizedDailyGrowth, "date", currentDateParts.date)
        );
        setLatestMonthlyGrowth(
          getGrowthCountByField(
            statisticsPayload?.monthlyGrowth || [],
            "month",
            currentDateParts.month
          )
        );
        setDailyGrowthChart(
          buildDailyGrowthChartData(normalizedDailyGrowth, currentDateParts.date)
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setArtist(null);
        setFollowers([]);
        setPagination({
          ...DEFAULT_PAGINATION,
          page,
        });
        setLatestDailyGrowth(0);
        setLatestMonthlyGrowth(0);
        setDailyGrowthChart(buildDailyGrowthChartData([], currentDateParts.date));
        setErrorMessage(
          getApiErrorMessage(
            error,
            "Kh\u00f4ng th\u1ec3 t\u1ea3i d\u1eef li\u1ec7u ng\u01b0\u1eddi theo d\u00f5i."
          )
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchFollowers();

    return () => {
      isMounted = false;
    };
  }, [page, reloadKey]);

  const totalPages = Number(pagination?.totalPages) || 0;
  const totalItems = Number(pagination?.totalItems) || 0;
  const limit = Number(pagination?.limit) || DEFAULT_LIMIT;

  const handlePreviousPage = () => {
    setPage((currentPage) => {
      if (currentPage <= 1) {
        return currentPage;
      }

      return currentPage - 1;
    });
  };

  const handleNextPage = () => {
    setPage((currentPage) => {
      const nextTotalPages = Number(pagination?.totalPages) || 1;

      if (currentPage >= nextTotalPages) {
        return currentPage;
      }

      return currentPage + 1;
    });
  };

  const refreshFollowers = () => {
    setReloadKey((currentKey) => currentKey + 1);
  };

  return (
    <section className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-[#ebe6ff] bg-white shadow-[0_24px_60px_-36px_rgba(70,42,135,0.35)] dark:border-white/10 dark:bg-[#181818] dark:shadow-none">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(124,108,242,0.18),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(140,112,240,0.12),_transparent_35%),linear-gradient(135deg,#ffffff_0%,#fcfbff_56%,#f7f4ff_100%)] px-5 py-6 dark:bg-[radial-gradient(circle_at_top_left,_rgba(124,108,242,0.22),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(140,112,240,0.18),_transparent_35%),linear-gradient(135deg,#181818_0%,#1b1b1f_56%,#17171a_100%)] sm:px-7 sm:py-7">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6f5cf1] dark:text-[#c4bbff]">
                NGƯỜI THEO DÕI
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#241b15] dark:text-white">
                {"Ng\u01b0\u1eddi theo d\u00f5i"}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6a647d] dark:text-[#a1a1aa]">
                {artist?.name
                  ? `Ngh\u1ec7 s\u0129: ${artist.name}`
                  : "Theo d\u00f5i danh s\u00e1ch ng\u01b0\u1eddi theo d\u00f5i m\u1edbi nh\u1ea5t c\u1ee7a ngh\u1ec7 s\u0129 c\u1ee7a b\u1ea1n."}
              </p>
            </div>

            <button
              type="button"
              onClick={refreshFollowers}
              disabled={isLoading}
              className="inline-flex items-center gap-2 self-start rounded-2xl border border-[#e7e1ff] bg-white px-4 py-3 text-sm font-medium text-[#2f2747] shadow-sm transition hover:border-[#cbbfff] hover:bg-[#faf8ff] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]"
            >
              <RefreshCcw className={["h-4 w-4", isLoading ? "animate-spin" : ""].join(" ")} />
              {"T\u1ea3i l\u1ea1i d\u1eef li\u1ec7u"}
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <SummaryCard
              icon={Users}
              label={"T\u1ed5ng ng\u01b0\u1eddi theo d\u00f5i"}
              value={totalItems}
              helper={"T\u1ed5ng s\u1ed1 t\u00e0i kho\u1ea3n \u0111ang theo d\u00f5i ngh\u1ec7 s\u0129 c\u1ee7a b\u1ea1n."}
              isLoading={isLoading}
            />
            <SummaryCard
              icon={TrendingUp}
              label={"T\u0103ng h\u00f4m nay"}
              value={latestDailyGrowth}
              helper={"S\u1ed1 ng\u01b0\u1eddi theo d\u00f5i m\u1edbi ghi nh\u1eadn \u1edf m\u1ed1c ng\u00e0y g\u1ea7n nh\u1ea5t."}
              isLoading={isLoading}
            />
            <SummaryCard
              icon={CalendarDays}
              label={"T\u0103ng th\u00e1ng n\u00e0y"}
              value={latestMonthlyGrowth}
              helper={"S\u1ed1 ng\u01b0\u1eddi theo d\u00f5i m\u1edbi ghi nh\u1eadn \u1edf m\u1ed1c th\u00e1ng g\u1ea7n nh\u1ea5t."}
              isLoading={isLoading}
            />
          </div>
        </div>
      </section>

      {errorMessage ? (
        <section className="rounded-[24px] border border-rose-200 bg-rose-50 p-6 shadow-sm dark:border-rose-400/20 dark:bg-rose-500/10">
          <p className="text-base font-semibold text-rose-900 dark:text-rose-100">
            {"Kh\u00f4ng th\u1ec3 t\u1ea3i d\u1eef li\u1ec7u ng\u01b0\u1eddi theo d\u00f5i"}
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-rose-700 dark:text-rose-200/90">
            {errorMessage}
          </p>
          <button
            type="button"
            onClick={refreshFollowers}
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#6f5cf1] px-5 text-sm font-semibold text-white transition hover:bg-[#5f4fe0]"
          >
            <RefreshCcw className="h-4 w-4" />
            {"Th\u1eed l\u1ea1i"}
          </button>
        </section>
      ) : null}

      {!errorMessage ? (
        <section className={CARD_STYLES}>
          {isLoading ? (
            <ArtistFollowerChartSkeleton />
          ) : (
            <DailyGrowthChart data={dailyGrowthChart} />
          )}
        </section>
      ) : null}

      <section className={CARD_STYLES}>
        <div className="mb-5 flex flex-col gap-3 border-b border-[#f0ebff] pb-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-medium text-[#6f5cf1] dark:text-[#c4bbff]">
              <Users className="h-4 w-4" />
              {"Danh s\u00e1ch ng\u01b0\u1eddi theo d\u00f5i"}
            </div>
            <p className="mt-2 text-sm text-[#7b7494] dark:text-[#a1a1aa]">
              {`Hi\u1ec3n th\u1ecb t\u1ed1i \u0111a ${limit} ng\u01b0\u1eddi theo d\u00f5i tr\u00ean m\u1ed7i trang.`}
            </p>
          </div>
        </div>

        {isLoading ? (
          <ArtistFollowerSkeleton />
        ) : followers.length === 0 ? (
          <ArtistFollowerEmpty />
        ) : (
          <ArtistFollowerList followers={followers} />
        )}
      </section>

      {!isLoading && !errorMessage ? (
        <ArtistFollowerPagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          limit={limit}
          onPreviousPage={handlePreviousPage}
          onNextPage={handleNextPage}
        />
      ) : null}
    </section>
  );
};

export default ArtistFollowerPage;
