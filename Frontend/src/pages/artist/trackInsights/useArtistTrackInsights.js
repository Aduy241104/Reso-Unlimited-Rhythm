import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import trackService from "../../../services/trackService";
import { getApiErrorMessage } from "../../../utils/apiError";
import {
  buildSummaryCards,
  CHART_METRICS,
  DEFAULT_RANGE,
  displayRawValue,
  EMPTY_ARRAY,
  MONTHLY_CHART_METRICS,
  resolveRange,
  resolveTrackId,
} from "./helpers";

export const useArtistTrackInsights = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tracks, setTracks] = useState([]);
  const [isTracksLoading, setIsTracksLoading] = useState(true);
  const [tracksError, setTracksError] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");
  const [chartMetric, setChartMetric] = useState("playCount");
  const [monthlyChartMetric, setMonthlyChartMetric] = useState("playCount");
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

  const summary = useMemo(() => analytics?.summary || {}, [analytics?.summary]);
  const dailyChart = useMemo(
    () => (Array.isArray(analytics?.dailyChart) ? analytics.dailyChart : EMPTY_ARRAY),
    [analytics?.dailyChart]
  );
  const monthlyChart = useMemo(
    () => (Array.isArray(analytics?.monthlyChart) ? analytics.monthlyChart : EMPTY_ARRAY),
    [analytics?.monthlyChart]
  );

  const chartMeta = CHART_METRICS[chartMetric];
  const maxMetricValue = useMemo(
    () =>
      dailyChart.reduce(
        (maxValue, item) => Math.max(maxValue, Number(item?.[chartMetric]) || 0),
        0
      ),
    [chartMetric, dailyChart]
  );
  const monthlyChartMeta = MONTHLY_CHART_METRICS[monthlyChartMetric];
  const maxMonthlyMetricValue = useMemo(
    () =>
      monthlyChart.reduce(
        (maxValue, item) =>
          Math.max(maxValue, Number(item?.[monthlyChartMetric]) || 0),
        0
      ),
    [monthlyChart, monthlyChartMetric]
  );

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

  const playsPerListener = useMemo(() => {
    const totalPlays = Number(summary?.totalPlays) || 0;
    const uniqueListeners = Number(summary?.uniqueListeners) || 0;

    if (totalPlays <= 0 || uniqueListeners <= 0) {
      return 0;
    }

    return totalPlays / uniqueListeners;
  }, [summary?.totalPlays, summary?.uniqueListeners]);

  const latestMetricValue =
    dailyChart.length > 0 ? dailyChart[dailyChart.length - 1]?.[chartMetric] : null;
  const chartIsEmpty = dailyChart.every(
    (item) => (Number(item?.[chartMetric]) || 0) === 0
  );

  const latestMonthlyMetricValue =
    monthlyChart.length > 0
      ? monthlyChart[monthlyChart.length - 1]?.[monthlyChartMetric]
      : null;
  const monthlyChartIsEmpty = monthlyChart.every(
    (item) => (Number(item?.[monthlyChartMetric]) || 0) === 0
  );

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

  const summaryCards = useMemo(() => buildSummaryCards(summary), [summary]);

  const quickInsights = useMemo(
    () => [
      {
        label: "Nghe trung bình",
        value: displayRawValue(summary?.averageListenDuration),
        helper:
          "Giữ nguyên giá trị thời gian nghe trung bình backend trả về cho bài hát này.",
        accentClassName: "bg-[#34caa5]",
      },
      {
        label: "Lượt phát mỗi người",
        value: playsPerListener.toFixed(2),
        helper:
          "Cho biết mức độ quay lại nghe của khán giả đối với cùng một bài hát.",
        accentClassName: "bg-[#6ea8fe]",
      },
      {
        label: "Ngày tốt nhất",
        value: bestPlayDay ? bestPlayDay.date : "Chưa có dữ liệu",
        helper: "Ngày có số lượt phát cao nhất trong tập dữ liệu hiện tại.",
        accentClassName: "bg-[#d6a06b]",
      },
      {
        label: "Ngày có hoạt động",
        value: `${activeDays}/${dailyChart.length || 0}`,
        helper: "Số ngày thực sự có phát sinh lượt nghe trong dữ liệu hiện có.",
        accentClassName: "bg-[#f17171]",
      },
    ],
    [activeDays, bestPlayDay, dailyChart.length, playsPerListener, summary?.averageListenDuration]
  );

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

  return {
    analytics,
    analyticsError,
    appliedFrom,
    appliedTo,
    chartIsEmpty,
    chartMeta,
    chartMetric,
    dailyChart,
    displayedTrack,
    draftFrom,
    draftTo,
    handleApplyCustomRange,
    handleRangeChange,
    isAnalyticsLoading,
    isTracksLoading,
    lastActiveDay,
    latestMetricValue,
    latestMonthlyMetricValue,
    maxMetricValue,
    maxMonthlyMetricValue,
    monthlyChart,
    monthlyChartIsEmpty,
    monthlyChartMeta,
    monthlyChartMetric,
    quickInsights,
    rangeHint,
    selectedRange,
    selectedTrack,
    selectedTrackId,
    setChartMetric,
    setDraftFrom,
    setDraftTo,
    setMonthlyChartMetric,
    setReloadNonce,
    summaryCards,
    trackSummary,
    tracks,
    tracksError,
    updateQuery,
    DEFAULT_RANGE,
  };
};
