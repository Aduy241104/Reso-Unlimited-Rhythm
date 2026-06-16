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
  { value: "7d", label: "7 ngay" },
  { value: "30d", label: "30 ngay" },
  { value: "90d", label: "90 ngay" },
];

const DAILY_METRICS = {
  streamCount: {
    label: "Luot stream",
    color: "#7c6cf2",
    description: "Tong luot stream duoc ghi nhan theo tung ngay.",
    formatter: (value) => formatNumber(value),
  },
  uniqueListeners: {
    label: "Nguoi nghe",
    color: "#34caa5",
    description: "So nguoi nghe duy nhat theo tung ngay.",
    formatter: (value) => formatNumber(value),
  },
};

const PERIOD_STREAM_METRICS = {
  streamCount: {
    label: "Luot stream",
    color: "#7c6cf2",
    description: "Tong luot stream trong tung moc thoi gian.",
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
  "Khong the tai du lieu overview cua nghe si.";

const buildSummaryCards = (summary) => [
  {
    label: "Stream trong giai doan",
    value: `${formatNumber(summary?.selectedRangeStreams)} luot`,
    helper: "Tong so luot stream trong khoang thoi gian dang xem.",
    icon: Headphones,
  },
  {
    label: "Nguoi nghe duy nhat",
    value: `${formatNumber(summary?.selectedRangeUniqueListeners)} nguoi`,
    helper: "So nguoi nghe duy nhat phat nhac cua ban trong giai doan nay.",
    icon: Users,
  },
  {
    label: "Tong stream thang nay",
    value: `${formatNumber(summary?.currentMonthStreams)} luot`,
    helper: "Tong so luot stream tu dau thang den hien tai.",
    icon: CalendarDays,
  },
  {
    label: "Tong stream nam nay",
    value: `${formatNumber(summary?.currentYearStreams)} luot`,
    helper: "Tong so luot stream tu dau nam den hien tai.",
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
  const summaryCards = useMemo(
    () => buildSummaryCards(overview?.summary || {}),
    [overview?.summary]
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

  const selectedRangeLabel =
    RANGE_OPTIONS.find((option) => option.value === selectedRange)?.label || "30 ngay";

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
          Dang tai performance overview...
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
          {overview?.artist?.name || "Nghe si"}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#7c7891]">
          Theo doi hieu suat phat hanh theo giai doan, bai hat dang hoat dong tot nhat
          va co cau khan gia cua ban.
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
            <span>Nam thong ke theo thang</span>
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
          Giai doan dang xem:{" "}
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
        sectionTitle="Thong ke stream theo ngay"
        sectionDescription="Bieu do nay the hien luot stream va so nguoi nghe duy nhat theo tung ngay trong khoang ban dang chon."
        showTooltipListenValue={dailyMetric !== "streamCount"}
        tooltipLabelFormatter={(value) =>
          formatDateLabel(value, {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        }
        tooltipListenLabel="luot stream"
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
        sectionTitle={`Tong stream theo thang cua nam ${selectedYear}`}
        sectionDescription={`Tong luot stream cua tung thang trong nam ${selectedYear}. Tong cong nam nay hien la ${formatNumber(
          overview?.summary?.selectedYearStreams
        )} luot.`}
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
        sectionTitle="Tong stream theo nam"
        sectionDescription="So sanh tong luot stream cua 5 nam gan nhat de nhin xu huong tang truong dai han."
        showTooltipListenValue={false}
        tooltipLabelFormatter={(value) => value}
        tooltipListenValueKey="streamCount"
        xAxisLabelFormatter={(value) => value}
      />

      <section className="grid gap-6 xl:grid-cols-2">
        <BreakdownCard
          title="Thong ke do tuoi nguoi nghe"
          description={`Duoc tinh theo nguoi nghe duy nhat trong khoang ${selectedRangeLabel.toLowerCase()}.`}
          items={overview?.audience?.ageGroups || []}
          emptyMessage="Chua co nguoi nghe nao trong giai doan dang xem nen chua the phan tich do tuoi."
        />

        <BreakdownCard
          title="Thong ke khu vuc nguoi nghe"
          description="Xep theo so nguoi nghe duy nhat, uu tien quoc gia/khu vuc ghi nhan o lan nghe gan nhat trong giai doan."
          items={overview?.audience?.regions || []}
          emptyMessage="Chua co du lieu khu vuc nguoi nghe trong giai doan dang xem."
          maxItems={8}
        />
      </section>
    </section>
  );
};

export default ArtistOverviewPage;
