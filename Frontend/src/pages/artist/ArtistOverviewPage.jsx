import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarDays, Headphones, LoaderCircle, Users } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { routePaths } from "../../routes/routePaths";
import { getArtistPerformanceOverviewService } from "../../services/artistService";
import TrackInsightsChartPanel from "./trackInsights/components/TrackInsightsChartPanel";
import TrackInsightsSummaryGrid from "./trackInsights/components/TrackInsightsSummaryGrid";
import TrackInsightsTopTracksPanel from "./trackInsights/components/TrackInsightsTopTracksPanel";
import { BreakdownCard, formatDateLabel, formatNumber } from "./listenerBehaviorShared";

const DEFAULT_RANGE = "30d";
const RANGE_OPTIONS = [
  { value: "7d", label: "7 ngày" },
  { value: "30d", label: "30 ngày" },
  { value: "all", label: "Toàn thời gian" },
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

const normalizeErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Không thể tải dữ liệu tổng quan của nghệ sĩ.";

const buildSummaryCards = (summary, selectedRangeLabel) => [
  {
    label: `Stream ${selectedRangeLabel.toLowerCase()}`,
    value: `${formatNumber(summary?.selectedRangeStreams)} lượt`,
    helper: "Tổng số lượt stream trong giai đoạn đang xem.",
    icon: Headphones,
  },
  {
    label: "Người nghe duy nhất",
    value: `${formatNumber(summary?.selectedRangeUniqueListeners)} người`,
    helper: "Số người nghe duy nhất phát nhạc của bạn trong giai đoạn này.",
    icon: Users,
  },
  {
    label: "Tổng stream tháng này",
    value: `${formatNumber(summary?.currentMonthStreams)} lượt`,
    helper: "Tổng số lượt stream từ đầu tháng đến hiện tại.",
    icon: CalendarDays,
  },
  {
    label: "Tổng stream năm nay",
    value: `${formatNumber(summary?.currentYearStreams)} lượt`,
    helper: "Tổng số lượt stream từ đầu năm đến hiện tại.",
    icon: BarChart3,
  },
];

const ArtistOverviewPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentYear = new Date().getFullYear();
  const selectedRange = resolveRange(searchParams.get("range"));
  const selectedYear = Number.parseInt(searchParams.get("year") || "", 10) || currentYear;

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

  const selectedRangeLabel =
    RANGE_OPTIONS.find((option) => option.value === selectedRange)?.label || "30 ngày";

  const summaryCards = useMemo(
    () => buildSummaryCards(overview?.summary || {}, selectedRangeLabel),
    [overview?.summary, selectedRangeLabel]
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

  const audienceDescription =
    selectedRange === "all"
      ? "Được tính theo người nghe duy nhất trên toàn bộ lịch sử dữ liệu."
      : `Được tính theo người nghe duy nhất trong khoảng ${selectedRangeLabel.toLowerCase()}.`;

  const handleOpenTrackInsights = (trackId) => {
    if (!trackId) {
      return;
    }

    navigate(`${routePaths.artistAnalytics}?trackId=${encodeURIComponent(trackId)}`);
  };

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
          Theo dõi hiệu suất phát hành theo giai đoạn, bài hát đang hoạt động tốt nhất
          và cơ cấu khán giả của bạn.
        </p>

        <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
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

          <label className="flex items-center gap-3 text-sm text-[#645d86]">
            <span>Năm thống kê theo tháng</span>
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

        <div className="mt-4 rounded-[16px] border border-[#efeaff] bg-[#faf9ff] px-4 py-3 text-sm text-[#6b6682]">
          Giai đoạn đang xem:{" "}
          <span className="font-semibold text-[#2f2747]">
            {formatDateLabel(overview?.period?.from)} - {formatDateLabel(overview?.period?.to)}
          </span>{" "}
          ({selectedRangeLabel})
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {errorMessage}
        </div>
      ) : null}

      <TrackInsightsSummaryGrid
        summaryCards={summaryCards}
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
      />

      <TrackInsightsTopTracksPanel
        error=""
        isLoading={isLoading}
        onSelectTrack={handleOpenTrackInsights}
        selectedTrackId=""
        topTracks={overview?.topPerformingTracks?.topTracks || []}
        topTracksSummary={overview?.topPerformingTracks?.summary || null}
      />

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
        sectionDescription="Biểu đồ này thể hiện lượt stream và số người nghe duy nhất theo từng ngày trong giai đoạn bạn đang chọn."
        showTooltipListenValue={dailyMetric !== "streamCount"}
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
          overview?.summary?.selectedYearStreams
        )} lượt.`}
        showTooltipListenValue={false}
        tooltipLabelFormatter={(value) => formatMonthLabel(value)}
        tooltipListenValueKey="streamCount"
        xAxisLabelFormatter={(value) =>
          formatMonthLabel(value, { month: "2-digit", year: "2-digit" })
        }
      />

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

      <section className="grid gap-6 xl:grid-cols-2">
        <BreakdownCard
          title="Thống kê độ tuổi người nghe"
          description={audienceDescription}
          items={overview?.audience?.ageGroups || []}
          emptyMessage="Chưa có người nghe nào trong giai đoạn đang xem nên chưa thể phân tích độ tuổi."
        />

        <BreakdownCard
          title="Thống kê khu vực người nghe"
          description="Xếp theo số người nghe duy nhất, ưu tiên quốc gia hoặc khu vực ghi nhận ở lần nghe gần nhất trong giai đoạn."
          items={overview?.audience?.regions || []}
          emptyMessage="Chưa có dữ liệu khu vực người nghe trong giai đoạn đang xem."
          maxItems={8}
        />
      </section>
    </section>
  );
};

export default ArtistOverviewPage;
