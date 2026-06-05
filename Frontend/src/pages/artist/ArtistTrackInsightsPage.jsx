import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Clock3,
  Headphones,
  LoaderCircle,
  Music2,
  RefreshCcw,
  TrendingDown,
  TrendingUp,
  Users,
  Waves,
} from "lucide-react";
import trackService from "../../services/trackService";
import { routePaths } from "../../routes/routePaths";
import { createPlaceholderImage, formatTrackDuration } from "../../utils/albumDetail";
import { getApiErrorMessage } from "../../utils/apiError";

const DEFAULT_RANGE = "30d";
const EMPTY_ARRAY = [];
const VALID_RANGES = new Set(["7d", "30d", "90d", "custom"]);

const RANGE_OPTIONS = [
  { value: "7d", label: "7 ngày" },
  { value: "30d", label: "30 ngày" },
  { value: "90d", label: "90 ngày" },
  { value: "custom", label: "Tùy chỉnh" },
];

const CHART_METRICS = {
  playCount: {
    label: "Lượt phát",
    color: "#d6a06b",
    description: "Số lượt phát theo ngày",
    formatter: (value) => formatNumber(value),
  },
  uniqueListeners: {
    label: "Người nghe",
    color: "#6ea8fe",
    description: "Số người nghe theo ngày",
    formatter: (value) => formatNumber(value),
  },
  averageListenDuration: {
    label: "Nghe trung bình",
    color: "#34caa5",
    description: "Thời lượng nghe trung bình mỗi ngày",
    formatter: (value) => formatDurationLabel(value),
  },
  skipCount: {
    label: "Lượt bỏ qua",
    color: "#f17171",
    description: "Số lượt skip theo ngày",
    formatter: (value) => formatNumber(value),
  },
};

const formatNumber = (value) =>
  new Intl.NumberFormat("vi-VN").format(Number(value) || 0);

const formatPercent = (value, maximumFractionDigits = 2) =>
  `${new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(Number(value) || 0)}%`;

const formatDateLabel = (value, options = { day: "2-digit", month: "short" }) => {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("vi-VN", options).format(date);
};

const formatDateTime = (value) => {
  if (!value) {
    return "Chưa cập nhật";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Chưa cập nhật";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

function formatDurationLabel(value) {
  const totalSeconds = Number(value) || 0;

  if (totalSeconds <= 0) {
    return "0 giây";
  }

  if (totalSeconds < 60) {
    return `${new Intl.NumberFormat("vi-VN", {
      maximumFractionDigits: totalSeconds < 10 ? 1 : 0,
    }).format(totalSeconds)} giây`;
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.round(totalSeconds % 60);

  if (hours > 0) {
    return `${hours} giờ ${minutes} phút`;
  }

  if (seconds === 0) {
    return `${minutes} phút`;
  }

  return `${minutes} phút ${seconds} giây`;
}

const resolveRange = (value) => (VALID_RANGES.has(value) ? value : DEFAULT_RANGE);
const resolveTrackId = (track) => track?._id || track?.id || "";

const getTrackImage = (track) =>
  track?.coverImage?.[0] ||
  track?.avatar ||
  createPlaceholderImage(track?.title || "Bai hat", "#9b8cff", "#4f46a5");

const getTrendPresentation = (comparison, { inverse = false } = {}) => {
  const trend = comparison?.trend || "same";
  const current = Number(comparison?.current) || 0;
  const previous = Number(comparison?.previous) || 0;
  const changePercent = Number(comparison?.changePercent) || 0;

  if (previous === 0 && current > 0) {
    return {
      label: "Có dữ liệu mới",
      icon: TrendingUp,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (trend === "same" || changePercent === 0) {
    return {
      label: "Không đổi",
      icon: Activity,
      className: "border-neutral-200 bg-neutral-100 text-neutral-600",
    };
  }

  if (trend === "up") {
    if (inverse) {
      return {
        label: `+${formatPercent(changePercent, 1)}`,
        icon: TrendingUp,
        className: "border-rose-200 bg-rose-50 text-rose-700",
      };
    }

    return {
      label: `+${formatPercent(changePercent, 1)}`,
      icon: TrendingUp,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (inverse) {
    return {
      label: formatPercent(changePercent, 1),
      icon: TrendingDown,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  return {
    label: formatPercent(changePercent, 1),
    icon: TrendingDown,
    className: "border-rose-200 bg-rose-50 text-rose-700",
  };
};

const buildChartGeometry = (items, metricKey) => {
  const chartWidth = 900;
  const chartHeight = 320;
  const paddingX = 22;
  const paddingTop = 20;
  const paddingBottom = 30;
  const plotHeight = chartHeight - paddingTop - paddingBottom;
  const plotWidth = chartWidth - paddingX * 2;
  const values = items.map((item) => Number(item?.[metricKey]) || 0);
  const maxValue = Math.max(...values, 1);

  const points = items.map((item, index) => {
    const ratio = items.length === 1 ? 0.5 : index / (items.length - 1);
    const value = Number(item?.[metricKey]) || 0;

    return {
      x: paddingX + ratio * plotWidth,
      y: paddingTop + plotHeight - (value / maxValue) * plotHeight,
      value,
      date: item?.date,
    };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${
          chartHeight - paddingBottom
        } L ${points[0].x} ${chartHeight - paddingBottom} Z`
      : "";

  return {
    chartWidth,
    chartHeight,
    paddingX,
    paddingTop,
    paddingBottom,
    maxValue,
    points,
    linePath,
    areaPath,
  };
};

const SummaryCard = ({ icon, label, value, helper, comparison, inverseTrend = false }) => {
  const Icon = icon;
  const trend = getTrendPresentation(comparison, { inverse: inverseTrend });
  const TrendIcon = trend.icon;

  return (
    <article className="rounded-[15px] border border-[#e7e1ff] bg-white p-3 shadow-sm shadow-[#7c6cf2]/[0.05]">
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex h-8.5 w-8.5 items-center justify-center rounded-[11px] bg-[#f3f0ff] text-[#6f5cf1]">
          <Icon className="h-4 w-4" />
        </div>

        <span
          className={[
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
            trend.className,
          ].join(" ")}
        >
          <TrendIcon className="h-3.5 w-3.5" />
          {trend.label}
        </span>
      </div>

      <p className="mt-2.5 text-[12px] font-medium text-[#6b6682]">{label}</p>
      <p className="mt-1 text-[20px] font-semibold tracking-tight text-[#2f2747]">
        {value}
      </p>
      <p className="mt-1.5 text-[12px] leading-5 text-[#7c7891]">{helper}</p>
    </article>
  );
};

const InsightRow = ({ label, value, helper, accentClassName = "bg-[#8b5e3c]" }) => (
  <div className="rounded-[14px] border border-[#e7e1ff] bg-[#f8f6ff] p-3">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[13px] font-medium text-[#6b6682]">{label}</p>
        <p className="mt-1 text-base font-semibold text-[#2f2747]">{value}</p>
      </div>
      <div className={["h-9 w-1 rounded-full", accentClassName].join(" ")} />
    </div>
    <p className="mt-2 text-[13px] leading-5 text-[#7c7891]">{helper}</p>
  </div>
);

const TrackListCard = ({ track, isActive, onSelect }) => (
  <button
    type="button"
    onClick={onSelect}
    className={[
      "flex w-full items-center gap-2.5 border-b border-[#ece8ff] px-3 py-2 text-left transition last:border-b-0",
      isActive
        ? "bg-[#f3f0ff] text-[#2f2747]"
        : "bg-white text-[#2f2747] hover:bg-[#faf8ff]",
    ].join(" ")}
  >
    <img
      src={getTrackImage(track)}
      alt={track?.title || "Anh bia bai hat"}
      className="h-[38px] w-[38px] rounded-[8px] object-cover"
    />

    <div className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold">
            {track?.title || "Chưa có tên bài hát"}
          </p>
          <p className="mt-0.5 text-[10px] text-[#7c7891]">
            {track?.album?.title || "Chưa thuộc album nào"}
          </p>
        </div>
        <ArrowRight className="h-3 w-3 shrink-0 text-[#9a93b8]" />
      </div>

      <div className="mt-1 flex flex-wrap gap-2.5 text-[10px] text-[#7c7891]">
        <span
          className={[
            "font-medium",
            isActive ? "text-[#5f4fe0]" : "text-[#645d86]",
          ].join(" ")}
        >
          {formatTrackDuration(track?.duration)}
        </span>
        <span
          className={[
            "font-medium",
            isActive ? "text-[#5f4fe0]" : "text-[#6a56eb]",
          ].join(" ")}
        >
          {formatNumber(track?.stats?.totalPlay || 0)} lượt phát
        </span>
      </div>
    </div>
  </button>
);

const ArtistTrackInsightsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tracks, setTracks] = useState([]);
  const [isTracksLoading, setIsTracksLoading] = useState(true);
  const [tracksError, setTracksError] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");
  const [chartMetric, setChartMetric] = useState("playCount");
  const [draftFrom, setDraftFrom] = useState(searchParams.get("from") || "");
  const [draftTo, setDraftTo] = useState(searchParams.get("to") || "");
  const [reloadNonce, setReloadNonce] = useState(0);

  const selectedTrackId = searchParams.get("trackId") || "";
  const selectedRange = resolveRange(searchParams.get("range"));
  const appliedFrom = searchParams.get("from") || "";
  const appliedTo = searchParams.get("to") || "";

  const updateQuery = (updates, options = {}) => {
    const next = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") {
        next.delete(key);
        return;
      }

      next.set(key, String(value));
    });

    setSearchParams(next, options);
  };

  useEffect(() => {
    let isMounted = true;

    const loadTracks = async () => {
      setIsTracksLoading(true);
      setTracksError("");

      try {
        const response = await trackService.getArtistTracks();

        if (!isMounted) {
          return;
        }

        setTracks(response?.data?.tracks || []);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setTracks([]);
        setTracksError(
          getApiErrorMessage(error, "Không thể tải danh sách bài hát vào lúc này.")
        );
      } finally {
        if (isMounted) {
          setIsTracksLoading(false);
        }
      }
    };

    loadTracks();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (selectedRange === "custom") {
      setDraftFrom(appliedFrom);
      setDraftTo(appliedTo);
    }
  }, [appliedFrom, appliedTo, selectedRange]);

  useEffect(() => {
    if (!selectedTrackId) {
      setAnalytics(null);
      setAnalyticsError("");
      return;
    }

    if (selectedRange === "custom" && (!appliedFrom || !appliedTo)) {
      return;
    }

    let isMounted = true;

    const loadAnalytics = async () => {
      setIsAnalyticsLoading(true);
      setAnalyticsError("");

      try {
        const params =
          selectedRange === "custom"
            ? {
                range: "custom",
                from: appliedFrom,
                to: appliedTo,
              }
            : { range: selectedRange };

        const result = await trackService.getArtistTrackAnalytics(
          selectedTrackId,
          params
        );

        if (!isMounted) {
          return;
        }

        setAnalytics(result);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setAnalyticsError(
          getApiErrorMessage(error, "Không thể tải dữ liệu phân tích cho bài hát này.")
        );
      } finally {
        if (isMounted) {
          setIsAnalyticsLoading(false);
        }
      }
    };

    loadAnalytics();

    return () => {
      isMounted = false;
    };
  }, [selectedTrackId, selectedRange, appliedFrom, appliedTo, reloadNonce]);

  const selectedTrack = useMemo(
    () => tracks.find((track) => resolveTrackId(track) === selectedTrackId) || null,
    [selectedTrackId, tracks]
  );

  const displayedTrack = useMemo(() => {
    if (!analytics?.track && !selectedTrack) {
      return null;
    }

    return {
      ...selectedTrack,
      ...analytics?.track,
      _id: analytics?.track?.id || resolveTrackId(selectedTrack),
    };
  }, [analytics, selectedTrack]);

  const summary = analytics?.summary || {};
  const comparison = analytics?.comparison || {};
  const dailyChart = useMemo(
    () => (Array.isArray(analytics?.dailyChart) ? analytics.dailyChart : EMPTY_ARRAY),
    [analytics?.dailyChart]
  );
  const chartMeta = CHART_METRICS[chartMetric];
  const chartGeometry = useMemo(
    () => buildChartGeometry(dailyChart, chartMetric),
    [chartMetric, dailyChart]
  );

  const chartAverage = useMemo(() => {
    if (dailyChart.length === 0) {
      return 0;
    }

    const total = dailyChart.reduce(
      (sum, item) => sum + (Number(item?.[chartMetric]) || 0),
      0
    );

    return total / dailyChart.length;
  }, [chartMetric, dailyChart]);

  const bestPlayDay = useMemo(() => {
    if (dailyChart.length === 0) {
      return null;
    }

    return dailyChart.reduce((best, item) =>
      (Number(item?.playCount) || 0) > (Number(best?.playCount) || 0) ? item : best
    );
  }, [dailyChart]);

  const lastActiveDay = useMemo(
    () =>
      [...dailyChart]
        .reverse()
        .find((item) => (Number(item?.playCount) || 0) > 0) || null,
    [dailyChart]
  );

  const activeDays = useMemo(
    () => dailyChart.filter((item) => (Number(item?.playCount) || 0) > 0).length,
    [dailyChart]
  );

  const completionRate = useMemo(() => {
    const trackDuration = Number(displayedTrack?.duration) || 0;
    const averageListenDuration = Number(summary?.averageListenDuration) || 0;

    if (trackDuration <= 0 || averageListenDuration <= 0) {
      return 0;
    }

    return Math.min((averageListenDuration / trackDuration) * 100, 100);
  }, [displayedTrack?.duration, summary?.averageListenDuration]);

  const playsPerListener = useMemo(() => {
    const totalPlays = Number(summary?.totalPlays) || 0;
    const uniqueListeners = Number(summary?.uniqueListeners) || 0;

    if (totalPlays <= 0 || uniqueListeners <= 0) {
      return 0;
    }

    return totalPlays / uniqueListeners;
  }, [summary?.totalPlays, summary?.uniqueListeners]);

  const chartIsEmpty = chartGeometry.points.every((point) => point.value === 0);
  const trackSummary = useMemo(() => {
    const totalTracks = tracks.length;
    const totalPlays = tracks.reduce(
      (sum, track) => sum + Number(track?.stats?.totalPlay || 0),
      0
    );

    return {
      totalTracks,
      totalPlays,
    };
  }, [tracks]);

  const rangeHint =
    selectedTrackId && selectedRange === "custom" && (!appliedFrom || !appliedTo)
      ? "Hãy chọn ngày bắt đầu và ngày kết thúc rồi bấm áp dụng để xem dữ liệu."
      : "";

  const summaryCards = [
    {
      label: "Tổng lượt phát",
      value: formatNumber(summary?.totalPlays),
      helper: "Tổng số lượt phát ghi nhận của bài hát trong giai đoạn được chọn.",
      icon: Headphones,
      comparison: comparison?.totalPlays,
    },
    {
      label: "Người nghe",
      value: formatNumber(summary?.uniqueListeners),
      helper: "Tổng lượng người nghe riêng biệt ghi nhận trong toàn bộ giai đoạn đã chọn.",
      icon: Users,
      comparison: comparison?.uniqueListeners,
    },
    {
      label: "Tổng thời gian nghe",
      value: formatDurationLabel(summary?.totalListeningTime),
      helper: "Tổng thời lượng nghe tích lũy mà khán giả đã dành cho bài hát này.",
      icon: Clock3,
      comparison: null,
    },
    {
      label: "Nghe trung bình",
      value: formatDurationLabel(summary?.averageListenDuration),
      helper: "Thời lượng nghe trung bình trước khi người nghe dừng hoặc chuyển sang nội dung khác.",
      icon: Waves,
      comparison: comparison?.averageListenDuration,
    },
    {
      label: "Lượt bỏ qua",
      value: formatNumber(summary?.skipCount),
      helper: "Tổng số lần bài hát bị bỏ qua trong khoảng thời gian đang theo dõi.",
      icon: Activity,
      comparison: null,
    },
    {
      label: "Tỉ lệ bỏ qua",
      value: formatPercent(summary?.skipRate),
      helper: "Tỷ lệ phần trăm lượt phát kết thúc bằng hành động bỏ qua bài hát.",
      icon: TrendingDown,
      comparison: comparison?.skipRate,
      inverseTrend: true,
    },
  ];

  const handleRangeChange = (range) => {
    if (range === "custom") {
      updateQuery({
        range: "custom",
        from: appliedFrom || draftFrom || null,
        to: appliedTo || draftTo || null,
      });
      return;
    }

    updateQuery({
      range,
      from: null,
      to: null,
    });
  };

  const handleApplyCustomRange = () => {
    if (!draftFrom || !draftTo) {
      setAnalyticsError("Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc.");
      return;
    }

    if (draftFrom > draftTo) {
      setAnalyticsError("Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.");
      return;
    }

    updateQuery({
      range: "custom",
      from: draftFrom,
      to: draftTo,
    });
  };

  if (isTracksLoading) {
    return (
      <section className="rounded-[20px] border border-[#e7e1ff] bg-white p-7 text-sm text-[#6b6682] shadow-sm">
        <div className="flex items-center gap-3">
          <LoaderCircle className="h-5 w-5 animate-spin text-[#8b5e3c]" />
          Đang tải danh sách bài hát...
        </div>
      </section>
    );
  }

  if (tracks.length === 0) {
    return (
      <section className="rounded-[20px] border border-[#e7e1ff] bg-white p-7 shadow-sm">
        <p className="text-xs uppercase tracking-[0.3em] text-[#7c6cf2]">
          Bảng điều khiển nghệ sĩ
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#2f2747]">
          Phân tích bài hát
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#7c7891]">
          Bạn cần có ít nhất một bài hát để xem số liệu phân tích. Hãy tạo bài hát mới
          rồi quay lại trang này.
        </p>

        {tracksError ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {tracksError}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => navigate(routePaths.artistCreateTrack)}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#7c6cf2] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6857eb]"
        >
          Tạo bài hát mới
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[18px] border border-[#ece8ff] bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[#7c6cf2]">
              Bảng điều khiển nghệ sĩ
            </p>
            <h2 className="mt-2.5 text-[28px] font-semibold tracking-tight text-[#2f2747]">
              Danh sách bài hát
            </h2>
            <p className="mt-2.5 max-w-2xl text-[13px] leading-5 text-[#7c7891]">
              Chọn một bài hát bên dưới để xem bức tranh hiệu suất gồm lượt phát,
              người nghe, thời lượng nghe và tỷ lệ bỏ qua theo từng giai đoạn.
            </p>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className="rounded-[12px] border border-[#ece8ff] bg-[#faf8ff] px-3.5 py-2.5">
              <p className="text-sm text-[#6b6682]">Tổng số bài hát</p>
              <p className="mt-1 text-lg font-semibold text-[#2f2747]">
                {formatNumber(trackSummary.totalTracks)}
              </p>
            </div>
            <div className="rounded-[12px] border border-[#ece8ff] bg-[#faf8ff] px-3.5 py-2.5">
              <p className="text-sm text-[#6b6682]">Tổng lượt phát hiện có</p>
              <p className="mt-1 text-lg font-semibold text-[#2f2747]">
                {formatNumber(trackSummary.totalPlays)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[14px] border border-[#ece8ff] bg-white">
          {tracks.map((track) => {
            const trackId = resolveTrackId(track);

            return (
              <TrackListCard
                key={trackId}
                track={track}
                isActive={trackId === selectedTrackId}
                onSelect={() => updateQuery({ trackId })}
              />
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#ece8ff] pt-4">
          <p className="text-[13px] text-neutral-500">
            {selectedTrackId
              ? `Đang xem phân tích cho: ${selectedTrack?.title || "Bài hát đã chọn"}`
              : "Chưa chọn bài hát nào để xem phân tích."}
          </p>

          <button
            type="button"
            onClick={() => navigate(routePaths.artistMusic)}
            className="inline-flex items-center gap-2 text-[13px] font-medium text-[#6f5cf1] transition hover:text-[#5b4be0]"
          >
            Mở trang Nhạc của tôi
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {tracksError ? (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {tracksError}
        </div>
      ) : null}

      {!selectedTrackId ? (
        <section className="rounded-[20px] border border-dashed border-[#d8d0ff] bg-white p-8 text-center shadow-sm sm:p-9">
          <p className="text-lg font-semibold text-[#2f2747]">
            Chọn một bài hát để xem phân tích
          </p>
          <p className="mt-3 text-[13px] leading-5 text-[#7c7891]">
            Sau khi chọn, hệ thống sẽ hiển thị các chỉ số cốt lõi, biểu đồ theo ngày
            và diễn biến hiệu suất của bài hát tương ứng.
          </p>
        </section>
      ) : (
        <>
          <div className="relative overflow-hidden rounded-[20px] bg-[#6658d9] text-white shadow-[0_20px_60px_rgba(124,108,242,0.20)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.22),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(227,221,255,0.22),_transparent_30%)]" />
            <div className="relative grid gap-6 p-5 lg:p-6 xl:grid-cols-[minmax(0,1.2fr)_340px]">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-[#efeaff]">
                  Phân tích chi tiết
                </p>
                <h3 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                  {displayedTrack?.title || "Bài hát đã chọn"}
                </h3>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 sm:text-[15px]">
                  Theo dõi hiệu suất phát, khả năng giữ chân người nghe và xu hướng
                  bỏ qua để đánh giá sức hút của bài hát trong từng giai đoạn.
                </p>

                <div className="mt-5 flex flex-wrap gap-2.5">
                  {RANGE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleRangeChange(option.value)}
                      className={[
                        "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition",
                        selectedRange === option.value
                          ? "border-white bg-white text-[#4b3fb5]"
                          : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10 hover:text-white",
                      ].join(" ")}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {selectedRange === "custom" ? (
                  <div className="mt-4 flex flex-col gap-3 rounded-[20px] border border-white/10 bg-white/5 p-3.5 sm:flex-row sm:items-end">
                    <label className="flex-1">
                      <span className="text-xs uppercase tracking-[0.24em] text-white/55">
                        Từ ngày
                      </span>
                      <input
                        type="date"
                        value={draftFrom}
                        onChange={(event) => setDraftFrom(event.target.value)}
                        className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-black/10 px-4 text-sm text-white outline-none transition focus:border-[#f0cfa8]"
                      />
                    </label>
                    <label className="flex-1">
                      <span className="text-xs uppercase tracking-[0.24em] text-white/55">
                        Đến ngày
                      </span>
                      <input
                        type="date"
                        value={draftTo}
                        onChange={(event) => setDraftTo(event.target.value)}
                        className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-black/10 px-4 text-sm text-white outline-none transition focus:border-[#f0cfa8]"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleApplyCustomRange}
                      className="h-11 rounded-full bg-white px-5 text-sm font-semibold text-[#241b15] transition hover:brightness-95"
                    >
                      Áp dụng
                    </button>
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-3 text-sm text-white/65">
                  <div className="inline-flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-[#efeaff]" />
                    {analytics?.period?.from && analytics?.period?.to
                      ? `${formatDateLabel(analytics.period.from, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })} - ${formatDateLabel(analytics.period.to, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}`
                      : "Chọn khoảng thời gian để xem dữ liệu"}
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <Music2 className="h-4 w-4 text-[#efeaff]" />
                    Thời lượng {formatTrackDuration(displayedTrack?.duration)}
                  </div>
                </div>
              </div>

              <div className="rounded-[16px] border border-white/12 bg-white/[0.10] p-4 backdrop-blur-sm">
                <div className="flex items-start gap-4">
                  <img
                    src={getTrackImage(displayedTrack)}
                    alt={displayedTrack?.title || "Anh bia bai hat"}
                    className="h-16 w-16 rounded-[14px] object-cover shadow-lg shadow-black/20"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/45">
                      Bài hát đang chọn
                    </p>
                    <h3 className="mt-2 truncate text-xl font-semibold">
                      {displayedTrack?.title || "Bài hát đã chọn"}
                    </h3>
                    <p className="mt-2 text-sm text-white/60">
                      Lượt phát hiện có {formatNumber(displayedTrack?.stats?.totalPlay || 0)}
                    </p>
                    <p className="mt-2 text-sm text-white/60">
                      Cập nhật lần cuối {formatDateTime(analytics?.lastUpdatedAt)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => navigate(routePaths.artistTrackDetail(selectedTrackId))}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#241b15] transition hover:brightness-95"
                  >
                    Xem chi tiết
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setReloadNonce((value) => value + 1)}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Làm mới
                  </button>
                </div>
              </div>
            </div>
          </div>

          {rangeHint ? (
            <div className="rounded-[24px] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
              {rangeHint}
            </div>
          ) : null}

          {analyticsError ? (
            <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {analyticsError}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {summaryCards.map((card) => (
              <SummaryCard
                key={card.label}
                icon={card.icon}
                label={card.label}
                value={card.value}
                helper={card.helper}
                comparison={card.comparison}
                inverseTrend={card.inverseTrend}
              />
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.9fr)]">
            <section className="rounded-[18px] border border-[#e7e1ff] bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[#7c6cf2]">
                    Xu hướng theo ngày
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-[#2f2747]">
                    Biểu đồ hiệu suất
                  </h3>
                  <p className="mt-2 text-[13px] leading-5 text-[#7c7891]">
                    Chọn chỉ số cần theo dõi để so sánh diễn biến lượt phát, quy mô
                    người nghe, thời lượng nghe trung bình và số lượt bỏ qua.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {Object.entries(CHART_METRICS).map(([metricKey, metric]) => (
                    <button
                      key={metricKey}
                      type="button"
                      onClick={() => setChartMetric(metricKey)}
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

              <div className="mt-5 rounded-[16px] border border-[#e7e1ff] bg-[#f8f6ff] p-3.5 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[#2f2747]">
                      {chartMeta.label}
                    </p>
                    <p className="mt-1 text-sm text-[#7c7891]">
                      {chartMeta.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <p className="text-[#7c7891]">Đỉnh cao nhất</p>
                      <p className="mt-1 font-semibold text-[#2f2747]">
                        {chartMeta.formatter(chartGeometry.maxValue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#7c7891]">Trung bình ngày</p>
                      <p className="mt-1 font-semibold text-[#2f2747]">
                        {chartMeta.formatter(chartAverage)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  {isAnalyticsLoading ? (
                    <div className="flex h-[320px] items-center justify-center rounded-[20px] border border-dashed border-neutral-200 bg-white text-sm text-neutral-500">
                      <div className="flex items-center gap-3">
                        <LoaderCircle className="h-5 w-5 animate-spin text-[#8b5e3c]" />
                        Đang tải biểu đồ phân tích...
                      </div>
                    </div>
                  ) : chartIsEmpty ? (
                    <div className="flex h-[320px] flex-col items-center justify-center rounded-[20px] border border-dashed border-neutral-200 bg-white px-6 text-center">
                      <p className="text-base font-semibold text-[#2f2747]">
                        Chưa có hoạt động nghe trong giai đoạn này
                      </p>
                      <p className="mt-2 max-w-md text-sm leading-6 text-[#7c7891]">
                        Khi bài hát bắt đầu phát sinh lượt nghe, biểu đồ theo ngày sẽ
                        tự động phản ánh dữ liệu tại đây.
                      </p>
                    </div>
                  ) : (
                    <>
                      <svg
                        viewBox={`0 0 ${chartGeometry.chartWidth} ${chartGeometry.chartHeight}`}
                        className="h-[320px] w-full"
                        role="img"
                        aria-label={`${chartMeta.label} chart`}
                      >
                        <defs>
                          <linearGradient
                            id={`track-insights-gradient-${chartMetric}`}
                            x1="0%"
                            y1="0%"
                            x2="0%"
                            y2="100%"
                          >
                            <stop offset="0%" stopColor={chartMeta.color} stopOpacity="0.34" />
                            <stop offset="100%" stopColor={chartMeta.color} stopOpacity="0.02" />
                          </linearGradient>
                        </defs>

                        {[0, 0.25, 0.5, 0.75, 1].map((step) => {
                          const y =
                            chartGeometry.paddingTop +
                            (chartGeometry.chartHeight -
                              chartGeometry.paddingTop -
                              chartGeometry.paddingBottom) *
                              step;

                          return (
                            <line
                              key={step}
                              x1={chartGeometry.paddingX}
                              x2={chartGeometry.chartWidth - chartGeometry.paddingX}
                              y1={y}
                              y2={y}
                              stroke="rgba(36,27,21,0.08)"
                              strokeDasharray="4 8"
                            />
                          );
                        })}

                        <path
                          d={chartGeometry.areaPath}
                          fill={`url(#track-insights-gradient-${chartMetric})`}
                        />
                        <path
                          d={chartGeometry.linePath}
                          fill="none"
                          stroke={chartMeta.color}
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {chartGeometry.points.map((point) => (
                          <circle
                            key={`${point.date}-${point.x}`}
                            cx={point.x}
                            cy={point.y}
                            r="5"
                            fill={chartMeta.color}
                            stroke="white"
                            strokeWidth="3"
                          />
                        ))}
                      </svg>

                  <div className="mt-4 flex items-center justify-between gap-2 overflow-x-auto pb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[#9a93b8]">
                        {dailyChart.map((item, index) => {
                          const step =
                            dailyChart.length <= 7
                              ? 1
                              : dailyChart.length <= 14
                                ? 2
                                : dailyChart.length <= 31
                                  ? 5
                                  : Math.ceil(dailyChart.length / 6);

                          const isVisible =
                            index === 0 ||
                            index === dailyChart.length - 1 ||
                            index % step === 0;

                          return (
                            <span
                              key={item.date}
                              className={isVisible ? "min-w-[52px]" : "min-w-[52px] opacity-0"}
                            >
                              {formatDateLabel(item.date)}
                            </span>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>

            <aside className="space-y-4">
              <div className="rounded-[18px] border border-[#e7e1ff] bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.3em] text-[#7c6cf2]">
                  Chỉ số nhanh
                </p>
                <h3 className="mt-2 text-xl font-semibold text-[#2f2747]">
                  Chất lượng nghe
                </h3>
                <p className="mt-2 text-[13px] leading-5 text-[#7c7891]">
                  Nhóm chỉ số tóm lược giúp bạn đánh giá nhanh mức độ hấp dẫn của bài hát.
                </p>

                <div className="mt-4 space-y-2.5">
                  <InsightRow
                    label="Tỉ lệ nghe hết"
                    value={formatPercent(completionRate, 1)}
                    helper="Mức độ nghe trọn vẹn của khán giả so với toàn bộ thời lượng bài hát."
                    accentClassName="bg-[#34caa5]"
                  />
                  <InsightRow
                    label="Lượt phát mỗi người"
                    value={playsPerListener.toFixed(2)}
                    helper="Cho biết mức độ quay lại nghe của khán giả đối với cùng một bài hát."
                    accentClassName="bg-[#6ea8fe]"
                  />
                  <InsightRow
                    label="Ngày tốt nhất"
                    value={
                      bestPlayDay
                        ? `${formatDateLabel(bestPlayDay.date, {
                            day: "2-digit",
                            month: "short",
                          })} | ${formatNumber(bestPlayDay.playCount)} lượt phát`
                        : "Chưa có dữ liệu"
                    }
                    helper="Ngày có số lượt phát cao nhất trong khoảng đã chọn."
                    accentClassName="bg-[#d6a06b]"
                  />
                  <InsightRow
                    label="Ngày có hoạt động"
                    value={`${activeDays}/${dailyChart.length || 0}`}
                    helper="Số ngày thực sự có phát sinh lượt nghe trong cả giai đoạn."
                    accentClassName="bg-[#f17171]"
                  />
                </div>
              </div>

              <div className="rounded-[18px] border border-[#e7e1ff] bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.3em] text-[#7c6cf2]">
                  Tóm tắt
                </p>
                <h3 className="mt-2 text-xl font-semibold text-[#2f2747]">
                  Hoạt động gần nhất
                </h3>

                <div className="mt-4 rounded-[16px] border border-[#e7e1ff] bg-[#f8f6ff] p-3.5">
                  <p className="text-sm font-medium text-[#6b6682]">Ngày gần nhất có phát sinh nghe</p>
                  <p className="mt-2 text-lg font-semibold text-[#2f2747]">
                    {lastActiveDay
                      ? formatDateLabel(lastActiveDay.date, {
                          weekday: "short",
                          day: "2-digit",
                          month: "short",
                        })
                      : "Chưa có ngày hoạt động"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-500">
                    {lastActiveDay
                      ? `${formatNumber(lastActiveDay.playCount)} lượt phát, ${formatNumber(
                          lastActiveDay.uniqueListeners
                        )} người nghe, thời lượng nghe trung bình ${formatDurationLabel(
                          lastActiveDay.averageListenDuration
                        )}.`
                      : "Bài hát này chưa ghi nhận lượt nghe trong giai đoạn đã chọn."}
                  </p>
                </div>

                <div className="mt-3.5 rounded-[16px] border border-[#d8d0ff] bg-[#6f5cf1] p-3.5 text-white">
                  <p className="text-sm font-medium text-white/65">Khoảng thời gian</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {analytics?.period?.range === "custom"
                      ? "Tùy chỉnh"
                      : analytics?.period?.range?.toUpperCase() || DEFAULT_RANGE.toUpperCase()}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/70">
                    {analytics?.period?.from && analytics?.period?.to
                      ? `Từ ${formatDateLabel(analytics.period.from, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })} đến ${formatDateLabel(analytics.period.to, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}.`
                      : "Khoảng thời gian đã chọn sẽ hiển thị ở đây sau khi dữ liệu được tải."}
                  </p>
                </div>
              </div>
            </aside>
          </div>

          <section className="rounded-[18px] border border-[#e7e1ff] bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[#7c6cf2]">
                  Dữ liệu theo ngày
                </p>
                <h3 className="mt-2 text-xl font-semibold text-[#2f2747]">
                  Bảng chi tiết
                </h3>
                <p className="mt-2 text-[13px] leading-5 text-[#7c7891]">
                  Toàn bộ dữ liệu trả về từ backend theo từng ngày để bạn dễ đối chiếu
                  biến động tăng giảm.
                </p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 text-left text-sm">
                <thead className="bg-[#fcfaf7] text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Ngày</th>
                    <th className="px-4 py-3 font-medium">Lượt phát</th>
                    <th className="px-4 py-3 font-medium">Người nghe</th>
                    <th className="px-4 py-3 font-medium">Nghe trung bình</th>
                    <th className="px-4 py-3 font-medium">Lượt bỏ qua</th>
                    <th className="px-4 py-3 font-medium">Tỉ lệ hoàn thành</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-200">
                  {dailyChart.length > 0 ? (
                    dailyChart.map((item) => {
                      const trackDuration = Number(displayedTrack?.duration) || 0;
                      const dayCompletion =
                        trackDuration > 0
                          ? Math.min(
                              ((Number(item?.averageListenDuration) || 0) / trackDuration) * 100,
                              100
                            )
                          : 0;

                      return (
                        <tr key={item.date} className="text-[#2f261f]">
                          <td className="px-4 py-4 font-medium">
                            {formatDateLabel(item.date, {
                              weekday: "short",
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-4 py-4">{formatNumber(item.playCount)}</td>
                          <td className="px-4 py-4">{formatNumber(item.uniqueListeners)}</td>
                          <td className="px-4 py-4">
                            {formatDurationLabel(item.averageListenDuration)}
                          </td>
                          <td className="px-4 py-4">{formatNumber(item.skipCount)}</td>
                          <td className="px-4 py-4">
                            <div className="flex min-w-[180px] items-center gap-3">
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-200">
                                <div
                                  className="h-full rounded-full bg-[#8b5e3c]"
                                  style={{ width: `${dayCompletion}%` }}
                                />
                              </div>
                              <span className="w-12 text-right text-xs font-semibold text-neutral-500">
                                {formatPercent(dayCompletion, 0)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-sm text-neutral-500"
                      >
                        Chưa có dữ liệu phân tích theo ngày cho bài hát này.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </section>
  );
};

export default ArtistTrackInsightsPage;
