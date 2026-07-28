import { useEffect, useMemo, useState } from "react";
import {
  Disc3,
  Headphones,
  LoaderCircle,
  Users,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { getArtistPerformanceOverviewService } from "../../services/artistService";
import TrackInsightsChartPanel from "./trackInsights/components/TrackInsightsChartPanel";
import TrackInsightsSummaryGrid from "./trackInsights/components/TrackInsightsSummaryGrid";
import { formatDateLabel, formatNumber } from "./listenerBehaviorShared";

const DEFAULT_RANGE = "30d";
const RANGE_OPTIONS = [
  { value: "7d", label: "7 ngày" },
  { value: "30d", label: "30 ngày" },
];

const DAILY_METRICS = {
  streamCount: {
    label: "Lượt stream",
    color: "#7c6cf2",
    description: "Tổng lượt stream được ghi nhận theo từng ngày.",
    formatter: (value) => formatNumber(value),
  },
  uniqueListeners: {
    label: "Người nghe",
    color: "#34caa5",
    description: "Số người nghe duy nhất theo từng ngày.",
    formatter: (value) => formatNumber(value),
  },
};

const PERIOD_STREAM_METRICS = {
  streamCount: {
    label: "Lượt stream",
    color: "#7c6cf2",
    description: "Tổng lượt stream trong từng mốc thời gian.",
    formatter: (value) => formatNumber(value),
  },
};

const resolveRange = (value) =>
  RANGE_OPTIONS.some((option) => option.value === value) ? value : DEFAULT_RANGE;

const formatMonthLabel = (
  value,
  options = { month: "short", year: "numeric" }
) => {
  if (!value) {
    return "--";
  }

  const date = new Date(`${value}-01T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", options).format(date);
};

const getMetricExtremes = (items, key) => {
  const values = items.map((item) => Number(item?.[key]) || 0);

  return {
    max: values.length > 0 ? Math.max(...values) : 0,
    latest: values.length > 0 ? values[values.length - 1] : 0,
  };
};

const sumMetricValues = (items, key) =>
  items.reduce((total, item) => total + (Number(item?.[key]) || 0), 0);

const normalizeErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Không thể tải dữ liệu tổng quan của nghệ sĩ.";

const buildSummaryCards = (summary) => [
  {
    label: "Follower",
    value: `${formatNumber(summary?.followers)} người`,
    helper: "Tổng số người đang theo dõi nghệ sĩ của bạn trên hệ thống.",
    icon: Users,
  },
  {
    label: "Tổng bài hát",
    value: `${formatNumber(summary?.trackCount)} bài`,
    helper: "Tổng số track hiện thuộc về nghệ sĩ của bạn.",
    icon: Disc3,
  },
  {
    label: "Tổng lượt nghe",
    value: `${formatNumber(summary?.totalStreams)} lượt`,
    helper: "Tổng lượt stream toàn thời gian của toàn bộ catalog nghệ sĩ.",
    icon: Headphones,
  },
];

const ArtistOverviewPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentYear = new Date().getFullYear();
  const selectedRange = resolveRange(searchParams.get("range"));
  const selectedYear =
    Number.parseInt(searchParams.get("year") || "", 10) || currentYear;

  const [overview, setOverview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [dailyMetric, setDailyMetric] = useState("streamCount");
  const [monthlyMetric, setMonthlyMetric] = useState("streamCount");
  const [yearlyMetric, setYearlyMetric] = useState("streamCount");

  useEffect(() => {
    let isMounted = true;

    const loadOverview = async () => {
      setIsLoading(true);

      try {
        const response = await getArtistPerformanceOverviewService({
          range: selectedRange,
          year: selectedYear,
        });

        if (!isMounted) {
          return;
        }

        setOverview(response);
        setErrorMessage("");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(normalizeErrorMessage(error));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadOverview();

    return () => {
      isMounted = false;
    };
  }, [selectedRange, selectedYear]);

  const updateFilters = (updates) => {
    const nextParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        nextParams.delete(key);
        return;
      }

      nextParams.set(key, String(value));
    });

    setSearchParams(nextParams);
  };

  const dailyStats = overview?.dailyStats || [];
  const monthlyStats = useMemo(
    () =>
      (overview?.monthlyStats || []).map((item) => ({
        ...item,
        month: item.monthKey,
      })),
    [overview?.monthlyStats]
  );
  const yearlyStats = overview?.yearlyStats || [];

  const summaryCards = useMemo(
    () => buildSummaryCards(overview?.summary || {}),
    [overview?.summary]
  );

  const selectedRangeLabel =
    RANGE_OPTIONS.find((option) => option.value === selectedRange)?.label ||
    "30 ngày";

  const selectedYearTotalStreams = useMemo(
    () => sumMetricValues(monthlyStats, "streamCount"),
    [monthlyStats]
  );

  const dailyExtremes = useMemo(
    () => getMetricExtremes(dailyStats, dailyMetric),
    [dailyMetric, dailyStats]
  );
  const monthlyExtremes = useMemo(
    () => getMetricExtremes(monthlyStats, monthlyMetric),
    [monthlyMetric, monthlyStats]
  );
  const yearlyExtremes = useMemo(
    () => getMetricExtremes(yearlyStats, yearlyMetric),
    [yearlyMetric, yearlyStats]
  );

  const dailyChartIsEmpty = dailyStats.every(
    (item) =>
      Number(item?.streamCount || 0) === 0 &&
      Number(item?.uniqueListeners || 0) === 0
  );
  const monthlyChartIsEmpty = monthlyStats.every(
    (item) => Number(item?.streamCount || 0) === 0
  );
  const yearlyChartIsEmpty = yearlyStats.every(
    (item) => Number(item?.streamCount || 0) === 0
  );

  const availableYears = useMemo(() => {
    const years = new Set([selectedYear, ...(overview?.availableYears || [])]);
    return [...years].sort((left, right) => right - left);
  }, [overview?.availableYears, selectedYear]);

  if (isLoading && !overview) {
    return (
      <section className="rounded-[20px] border border-[#e7e1ff] bg-white p-7 text-sm text-[#6b6682] shadow-sm">
        <div className="flex items-center gap-3">
          <LoaderCircle className="h-5 w-5 animate-spin text-[#7c6cf2]" />
          Đang tải tổng quan hiệu suất nghệ sĩ...
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <section className="rounded-[20px] border border-[#e7e1ff] bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.3em] text-[#7c6cf2]">
          Artist Performance Overview
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#2f2747]">
          {overview?.artist?.name || "Nghệ sĩ"}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#7c7891]">
          Các chỉ số tổng quan bên dưới luôn được tính theo toàn thời gian. Bộ
          lọc 7 ngày và 30 ngày chỉ áp dụng cho biểu đồ stream theo ngày.
        </p>
      </section>

      {errorMessage ? (
        <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {errorMessage}
        </div>
      ) : null}

      <TrackInsightsSummaryGrid
        summaryCards={summaryCards}
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      />

      <section className="space-y-3">
        <div className="rounded-[18px] border border-[#e7e1ff] bg-white px-4 py-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateFilters({ range: option.value })}
                  className={[
                    "rounded-full border px-3.5 py-2 text-sm font-medium transition",
                    selectedRange === option.value
                      ? "border-[#6f5cf1] bg-[#6f5cf1] text-white"
                      : "border-[#e7e1ff] bg-[#f8f6ff] text-[#645d86] hover:border-[#b7abff] hover:text-[#2f2747]",
                  ].join(" ")}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="text-sm text-[#6b6682]">
              Biểu đồ ngày đang xem:{" "}
              <span className="font-semibold text-[#2f2747]">
                {formatDateLabel(overview?.period?.from)} -{" "}
                {formatDateLabel(overview?.period?.to)}
              </span>{" "}
              ({selectedRangeLabel})
            </div>
          </div>
        </div>

      <TrackInsightsChartPanel
        embedded={false}
        chartIsEmpty={dailyChartIsEmpty}
        chartMeta={DAILY_METRICS[dailyMetric]}
        chartMetric={dailyMetric}
        items={dailyStats}
        isAnalyticsLoading={isLoading}
        latestMetricValue={dailyExtremes.latest}
        maxMetricValue={dailyExtremes.max}
        metricOptions={DAILY_METRICS}
        onChangeMetric={setDailyMetric}
        sectionEyebrow="Daily Streaming"
        sectionTitle="Thống kê stream theo ngày"
        sectionDescription={`Biểu đồ này thể hiện lượt stream và số người nghe duy nhất theo từng ngày trong ${selectedRangeLabel.toLowerCase()} gần nhất.`}
        showTooltipListenValue={false}
        tooltipLabelFormatter={(value) =>
          formatDateLabel(value, {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        }
        tooltipListenLabel="lượt stream"
        tooltipListenValueKey="streamCount"
        xAxisLabelFormatter={(value) =>
          formatDateLabel(value, { day: "2-digit", month: "short" })
        }
      />
      </section>

      <section className="space-y-3">
        <div className="rounded-[18px] border border-[#e7e1ff] bg-white px-4 py-4 shadow-sm">
          <div className="flex flex-col gap-2 text-sm text-[#645d86] sm:flex-row sm:items-center sm:justify-between">
            <span className="font-medium text-[#2f2747]">
              Chọn năm cho biểu đồ theo tháng
            </span>
            <label className="flex items-center gap-3">
              <span>Năm</span>
              <select
                value={selectedYear}
                onChange={(event) => updateFilters({ year: event.target.value })}
                className="rounded-xl border border-[#e7e1ff] bg-white px-3 py-2 text-sm font-medium text-[#2f2747] outline-none transition focus:border-[#7c6cf2]"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

      <TrackInsightsChartPanel
        embedded={false}
        chartIsEmpty={monthlyChartIsEmpty}
        chartMeta={PERIOD_STREAM_METRICS[monthlyMetric]}
        chartMetric={monthlyMetric}
        items={monthlyStats}
        isAnalyticsLoading={isLoading}
        latestMetricValue={monthlyExtremes.latest}
        maxMetricValue={monthlyExtremes.max}
        metricOptions={PERIOD_STREAM_METRICS}
        onChangeMetric={setMonthlyMetric}
        sectionEyebrow="Monthly Totals"
        sectionTitle={`Tổng stream theo tháng của năm ${selectedYear}`}
        sectionDescription={`Tổng lượt stream của từng tháng trong năm ${selectedYear}. Tổng cộng năm này hiện là ${formatNumber(
          selectedYearTotalStreams
        )} lượt.`}
        showTooltipListenValue={false}
        tooltipLabelFormatter={(value) => formatMonthLabel(value)}
        tooltipListenValueKey="streamCount"
        xAxisLabelFormatter={(value) =>
          formatMonthLabel(value, { month: "2-digit", year: "2-digit" })
        }
      />
      </section>

      <TrackInsightsChartPanel
        embedded={false}
        chartIsEmpty={yearlyChartIsEmpty}
        chartMeta={PERIOD_STREAM_METRICS[yearlyMetric]}
        chartMetric={yearlyMetric}
        items={yearlyStats}
        isAnalyticsLoading={isLoading}
        latestMetricValue={yearlyExtremes.latest}
        maxMetricValue={yearlyExtremes.max}
        metricOptions={PERIOD_STREAM_METRICS}
        onChangeMetric={setYearlyMetric}
        sectionEyebrow="Yearly Totals"
        sectionTitle="Tổng stream theo năm"
        sectionDescription="So sánh tổng lượt stream của 5 năm gần nhất để nhìn xu hướng tăng trưởng dài hạn."
        showTooltipListenValue={false}
        tooltipLabelFormatter={(value) => value}
        tooltipListenValueKey="streamCount"
        xAxisLabelFormatter={(value) => value}
      />
    </section>
  );
};

export default ArtistOverviewPage;
