import {
  Activity,
  Clock3,
  Headphones,
  TrendingDown,
  Users,
  Waves,
} from "lucide-react";
import { createPlaceholderImage } from "../../../utils/albumDetail";

export const DEFAULT_RANGE = "30d";
export const EMPTY_ARRAY = [];
export const VALID_RANGES = new Set(["7d", "30d", "90d", "custom"]);

export const RANGE_OPTIONS = [
  { value: "7d", label: "7 ngày" },
  { value: "30d", label: "30 ngày" },
  { value: "90d", label: "90 ngày" },
  { value: "custom", label: "Tùy chỉnh" },
];

export const formatNumber = (value) =>
  new Intl.NumberFormat("vi-VN").format(Number(value) || 0);

export const formatPercent = (value, maximumFractionDigits = 2) =>
  `${new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(Number(value) || 0)}%`;

export const displayRawValue = (value, fallback = "0") => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return String(value);
};

export const CHART_METRICS = {
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
    description: "Thời lượng nghe trung bình mỗi ngày, hiển thị đúng giá trị API trả về",
    formatter: (value) => displayRawValue(value),
  },
  skipCount: {
    label: "Lượt bỏ qua",
    color: "#f17171",
    description: "Số lượt skip theo ngày",
    formatter: (value) => formatNumber(value),
  },
};

export const MONTHLY_CHART_METRICS = {
  playCount: {
    label: "Lượt phát",
    color: "#d6a06b",
    description: "Số lượt phát theo từng tháng",
    formatter: (value) => formatNumber(value),
  },
  uniqueListeners: {
    label: "Người nghe",
    color: "#6ea8fe",
    description: "Số người nghe theo từng tháng",
    formatter: (value) => formatNumber(value),
  },
  eligibleStreams: {
    label: "Stream hợp lệ",
    color: "#34caa5",
    description: "Số stream hợp lệ được ghi nhận theo tháng",
    formatter: (value) => formatNumber(value),
  },
  artistRevenueAmount: {
    label: "Doanh thu",
    color: "#f17171",
    description: "Doanh thu ước tính theo từng tháng",
    formatter: (value) => formatNumber(value),
  },
};

export const formatDateLabel = (
  value,
  options = { day: "2-digit", month: "short" }
) => {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("vi-VN", options).format(date);
};

export const formatDateTime = (value) => {
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

export const formatMonthLabel = (
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

export const resolveRange = (value) =>
  VALID_RANGES.has(value) ? value : DEFAULT_RANGE;

export const resolveTrackId = (track) => track?._id || track?.id || "";

export const getTrackImage = (track) =>
  track?.coverImage?.[0] ||
  track?.avatar ||
  createPlaceholderImage(track?.title || "Bai hat", "#9b8cff", "#4f46a5");

export const getVisibleDateStep = (totalItems) => {
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

export const buildSummaryCards = (summary) => [
  {
    label: "Tổng lượt phát",
    value: formatNumber(summary?.totalPlays),
    helper: "Tổng số lượt phát của bài hát trong dữ liệu backend hiện tại.",
    icon: Headphones,
  },
  {
    label: "Người nghe",
    value: formatNumber(summary?.uniqueListeners),
    helper: "Tổng số người nghe riêng biệt được ghi nhận.",
    icon: Users,
  },
  {
    label: "Tổng thời gian nghe",
    value: displayRawValue(summary?.totalListeningTime),
    helper: "Hiển thị nguyên giá trị thời gian nghe backend trả về.",
    icon: Clock3,
  },
  {
    label: "Nghe trung bình",
    value: displayRawValue(summary?.averageListenDuration),
    helper: "Hiển thị nguyên giá trị nghe trung bình, không format lại trên UI.",
    icon: Waves,
  },
  {
    label: "Lượt bỏ qua",
    value: formatNumber(summary?.skipCount),
    helper: "Tổng số lần bài hát bị bỏ qua trong dữ liệu hiện có.",
    icon: Activity,
  },
  {
    label: "Tỉ lệ bỏ qua",
    value: formatPercent(summary?.skipRate),
    helper: "Tỷ lệ phần trăm lượt phát kết thúc bằng hành động bỏ qua.",
    icon: TrendingDown,
  },
];
