import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Heart,
  LoaderCircle,
  MousePointerClick,
  Repeat2,
  SkipForward,
  UserPlus,
  Users,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { getArtistListenerBehaviorInsightsService } from "../../services/artistService";
import TrackInsightsChartPanel from "./trackInsights/components/TrackInsightsChartPanel";
import TrackInsightsSummaryGrid from "./trackInsights/components/TrackInsightsSummaryGrid";

const DEFAULT_RANGE = "30d";
const RANGE_OPTIONS = [
  { value: "7d", label: "7 ngày" },
  { value: "30d", label: "30 ngày" },
  { value: "90d", label: "90 ngày" },
];

const CHART_METRICS = {
  streamCount: {
    label: "Lượt stream",
    color: "#7c6cf2",
    description: "Tổng lượt stream theo từng ngày trong giai đoạn đã chọn.",
    formatter: (value) => formatNumber(value),
  },
  uniqueListeners: {
    label: "Người nghe duy nhất",
    color: "#34caa5",
    description: "Số người nghe duy nhất theo từng ngày.",
    formatter: (value) => formatNumber(value),
  },
  completionRate: {
    label: "Tỷ lệ nghe hết",
    color: "#3b82f6",
    description: "Tỷ lệ lượt nghe được ghi nhận là hoàn thành theo từng ngày.",
    formatter: (value) => formatPercent(value),
  },
  skipRate: {
    label: "Tỷ lệ bỏ qua",
    color: "#f97316",
    description: "Tỷ lệ lượt nghe bị bỏ qua theo từng ngày.",
    formatter: (value) => formatPercent(value),
  },
};

const resolveRange = (value) =>
  RANGE_OPTIONS.some((option) => option.value === value) ? value : DEFAULT_RANGE;

const formatNumber = (value) =>
  new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatPercent = (value) => `${formatNumber(value)}%`;

const SOURCE_LABEL_MAP = {
  "Track detail": "Chi tiết bài hát",
  "Chi tiet bai hat": "Chi tiết bài hát",
  Album: "Album",
  Playlist: "Playlist",
  Search: "Tìm kiếm",
  "Tim kiem": "Tìm kiếm",
  "Artist profile": "Trang nghệ sĩ",
  "Trang nghe si": "Trang nghệ sĩ",
  Unknown: "Không xác định",
  "Khong xac dinh": "Không xác định",
};

const DEVICE_LABEL_MAP = {
  Mobile: "Di động",
  Desktop: "Máy tính",
  Tablet: "Máy tính bảng",
  Unknown: "Không xác định",
  "Khong xac dinh": "Không xác định",
};

const LOYALTY_LABEL_MAP = {
  "1 stream": "1 lượt nghe",
  "1 luot nghe": "1 lượt nghe",
  "2 - 4 streams": "2 - 4 lượt nghe",
  "2 - 4 luot nghe": "2 - 4 lượt nghe",
  "5 - 9 streams": "5 - 9 lượt nghe",
  "5 - 9 luot nghe": "5 - 9 lượt nghe",
  "10+ streams": "10+ lượt nghe",
  "10+ luot nghe": "10+ lượt nghe",
};

const formatDateLabel = (
  value,
  options = { day: "2-digit", month: "short", year: "numeric" }
) => {
  if (!value) {
    return "--";
  }

  const date = new Date(`${value}T00:00:00`);

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

const localizeItems = (items = [], labelMap = {}) =>
  items.map((item) => ({
    ...item,
    label: labelMap[item?.label] || item?.label,
  }));

const normalizeErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Không thể tải dữ liệu hành vi người nghe.";

const buildSummaryCards = (summary) => [
  {
    label: "Tổng lượt stream",
    value: `${formatNumber(summary?.totalStreams)} lượt`,
    helper: "Toàn bộ lượt stream được ghi nhận trong giai đoạn đã chọn.",
    icon: Activity,
  },
  {
    label: "Người nghe duy nhất",
    value: `${formatNumber(summary?.uniqueListeners)} người`,
    helper: "Số người nghe duy nhất đã phát nhạc của bạn trong giai đoạn này.",
    icon: Users,
  },
  {
    label: "Người nghe quay lại",
    value: `${formatNumber(summary?.returningListeners)} người`,
    helper: "Người nghe có ít nhất 2 lượt nghe trong giai đoạn đã chọn.",
    icon: Repeat2,
  },
  {
    label: "Stream trung bình mỗi người",
    value: `${formatNumber(summary?.averageStreamsPerListener)} lượt`,
    helper: "Độ sâu nghe trung bình trên mỗi người nghe duy nhất.",
    icon: MousePointerClick,
  },
  {
    label: "Tỷ lệ nghe hết",
    value: formatPercent(summary?.completionRate),
    helper: "Số lượt nghe hoàn thành chia cho tổng lượt nghe.",
    icon: CheckCircle2,
  },
  {
    label: "Tỷ lệ bỏ qua",
    value: formatPercent(summary?.skipRate),
    helper: "Số lượt nghe bị bỏ qua chia cho tổng lượt nghe.",
    icon: SkipForward,
  },
];

const BreakdownCard = ({
  title,
  description,
  items,
  emptyMessage,
  maxItems,
  valueFormatter,
}) => {
  const visibleItems = useMemo(() => {
    const filteredItems = (items || []).filter((item) => Number(item?.count) > 0);
    return typeof maxItems === "number"
      ? filteredItems.slice(0, maxItems)
      : filteredItems;
  }, [items, maxItems]);

  return (
    <section className="rounded-[18px] border border-[#e7e1ff] bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-[#2f2747]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#7c7891]">{description}</p>

      {visibleItems.length === 0 ? (
        <div className="mt-5 rounded-[16px] border border-dashed border-neutral-200 bg-[#faf9ff] px-4 py-6 text-sm text-[#7c7891]">
          {emptyMessage}
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {visibleItems.map((item) => (
            <div key={item.key || item.label}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <p className="font-medium text-[#2f2747]">{item.label}</p>
                <p className="text-[#6b6682]">
                  {valueFormatter
                    ? valueFormatter(item)
                    : `${formatNumber(item.count)} (${formatPercent(item.percentage)})`}
                </p>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f0edff]">
                <div
                  className="h-full rounded-full bg-[#7c6cf2]"
                  style={{ width: `${Math.min(Number(item.percentage) || 0, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

const EngagementCard = ({ engagement }) => (
  <section className="rounded-[18px] border border-[#e7e1ff] bg-white p-5 shadow-sm">
    <h3 className="text-lg font-semibold text-[#2f2747]">Tương tác của người nghe</h3>
    <p className="mt-2 text-sm leading-6 text-[#7c7891]">
      Ghi nhận các tương tác của người nghe trong giai đoạn đã chọn với trang nghệ sĩ
      và các bài hát của bạn.
    </p>

    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {[
        {
          label: "Người nghe có tương tác",
          value: formatNumber(engagement?.engagedListeners),
          helper: `${formatPercent(engagement?.engagementRate)} trên tổng người nghe duy nhất`,
          icon: Users,
        },
        {
          label: "Lượt theo dõi",
          value: formatNumber(engagement?.followActions),
          helper: "Số lượt follow nghệ sĩ trong giai đoạn này",
          icon: UserPlus,
        },
        {
          label: "Lượt thích",
          value: formatNumber(engagement?.likeActions),
          helper: "Số lượt thích bài hát hoặc nghệ sĩ trong giai đoạn này",
          icon: Heart,
        },
        {
          label: "Tổng tương tác",
          value: formatNumber(engagement?.totalActions),
          helper: "Tổng hợp lượt thích và theo dõi",
          icon: MousePointerClick,
        },
      ].map((item) => (
        <div
          key={item.label}
          className="rounded-[16px] border border-[#efeaff] bg-[#faf9ff] p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-[#7c7891]">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-[#2f2747]">{item.value}</p>
            </div>
            <item.icon className="h-5 w-5 text-[#7c6cf2]" />
          </div>
          <p className="mt-3 text-xs leading-5 text-[#7c7891]">{item.helper}</p>
        </div>
      ))}
    </div>
  </section>
);

const ArtistListenerBehaviorPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedRange = resolveRange(searchParams.get("range"));

  const [insights, setInsights] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [dailyMetric, setDailyMetric] = useState("streamCount");

  useEffect(() => {
    let isMounted = true;

    const loadInsights = async () => {
      setIsLoading(true);

      try {
        const response = await getArtistListenerBehaviorInsightsService({
          range: selectedRange,
        });

        if (!isMounted) {
          return;
        }

        setInsights(response);
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

    loadInsights();

    return () => {
      isMounted = false;
    };
  }, [selectedRange]);

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

  const summaryCards = useMemo(
    () => buildSummaryCards(insights?.summary || {}),
    [insights?.summary]
  );
  const dailyStats = insights?.dailyStats || [];
  const dailyExtremes = useMemo(
    () => getMetricExtremes(dailyStats, dailyMetric),
    [dailyMetric, dailyStats]
  );
  const dailyChartIsEmpty = dailyStats.every(
    (item) =>
      Number(item?.streamCount || 0) === 0 &&
      Number(item?.uniqueListeners || 0) === 0 &&
      Number(item?.completionRate || 0) === 0 &&
      Number(item?.skipRate || 0) === 0
  );

  if (isLoading && !insights) {
    return (
      <section className="rounded-[20px] border border-[#e7e1ff] bg-white p-7 text-sm text-[#6b6682] shadow-sm">
        <div className="flex items-center gap-3">
          <LoaderCircle className="h-5 w-5 animate-spin text-[#7c6cf2]" />
          Đang tải dữ liệu hành vi người nghe...
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <section className="rounded-[20px] border border-[#e7e1ff] bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.3em] text-[#7c6cf2]">
          Hành vi người nghe
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#2f2747]">
          {insights?.artist?.name || "Nghệ sĩ"}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#7c7891]">
          Theo dõi cách người nghe quay lại, nghe hết bài, bỏ qua, tương tác và
          khám phá nhạc của bạn trong giai đoạn đã chọn.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
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

        <div className="mt-4 rounded-[16px] border border-[#efeaff] bg-[#faf9ff] px-4 py-3 text-sm text-[#6b6682]">
          Giai đoạn đang xem:{" "}
          <span className="font-semibold text-[#2f2747]">
            {formatDateLabel(insights?.period?.from)} - {formatDateLabel(insights?.period?.to)}
          </span>
        </div>
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

      <TrackInsightsChartPanel
        embedded={false}
        chartIsEmpty={dailyChartIsEmpty}
        chartMeta={CHART_METRICS[dailyMetric]}
        chartMetric={dailyMetric}
        items={dailyStats}
        isAnalyticsLoading={isLoading}
        latestMetricValue={dailyExtremes.latest}
        maxMetricValue={dailyExtremes.max}
        metricOptions={CHART_METRICS}
        onChangeMetric={setDailyMetric}
        sectionEyebrow="Hành vi theo ngày"
        sectionTitle="Xu hướng hành vi người nghe theo ngày"
        sectionDescription="Theo dõi biến động về lượng nghe và chất lượng nghe qua từng ngày."
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

      <section className="grid gap-6 xl:grid-cols-2">
        <BreakdownCard
          title="Nguồn nghe nổi bật"
          description="Những nguồn mà người nghe bắt đầu phát nhạc nhiều nhất trong giai đoạn đã chọn."
          items={localizeItems(insights?.behavior?.sources || [], SOURCE_LABEL_MAP)}
          emptyMessage="Chưa có dữ liệu nguồn nghe trong giai đoạn này."
          maxItems={6}
        />

        <BreakdownCard
          title="Phân bổ thiết bị"
          description="Thiết bị mà người nghe đã sử dụng để phát nhạc của bạn."
          items={localizeItems(insights?.behavior?.devices || [], DEVICE_LABEL_MAP)}
          emptyMessage="Chưa có dữ liệu thiết bị trong giai đoạn này."
          maxItems={6}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <BreakdownCard
          title="Khung giờ nghe cao điểm"
          description="Những khung giờ có lượng stream mạnh nhất trong giai đoạn."
          items={insights?.behavior?.listeningHours || []}
          emptyMessage="Chưa có hoạt động nghe nào trong giai đoạn này."
          maxItems={6}
        />

        <BreakdownCard
          title="Phân khúc mức độ trung thành"
          description="Mức độ nghe sâu của người nghe trong giai đoạn đã chọn, dựa trên số lượt stream mỗi người."
          items={localizeItems(
            insights?.behavior?.loyaltySegments || [],
            LOYALTY_LABEL_MAP
          )}
          emptyMessage="Chưa có dữ liệu phân khúc người nghe trong giai đoạn này."
          valueFormatter={(item) =>
            `${formatNumber(item.count)} người (${formatPercent(item.percentage)})`
          }
        />
      </section>

      <EngagementCard engagement={insights?.behavior?.engagement || {}} />
    </section>
  );
};

export default ArtistListenerBehaviorPage;
