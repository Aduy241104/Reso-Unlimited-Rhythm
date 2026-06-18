import { MONTH_LABELS } from "./constants";

export const formatCurrency = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const formatCompactCurrency = (value) =>
  new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));

export const formatNumber = (value) =>
  new Intl.NumberFormat("vi-VN").format(Number(value || 0));

export const formatDate = (value) => {
  if (!value) return "Chưa có";
  return new Date(value).toLocaleDateString("vi-VN");
};

export const formatDateTime = (value) => {
  if (!value) return "Chưa có";
  return new Date(value).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export const getPreviousPeriod = (year, month) => {
  if (month === 1) {
    return { year: year - 1, month: 12 };
  }

  return { year, month: month - 1 };
};

export const formatPeriodLabel = (year, month) =>
  `${MONTH_LABELS[(month || 1) - 1]} ${year}`;

export const buildRecentRevenuePeriods = (
  count = 12,
  currentYear = new Date().getFullYear(),
  currentMonth = new Date().getMonth() + 1
) => {
  const periods = [];
  let cursorYear = currentYear;
  let cursorMonth = currentMonth;

  for (let index = 0; index < count; index += 1) {
    const previousPeriod = getPreviousPeriod(cursorYear, cursorMonth);
    periods.push(previousPeriod);
    cursorYear = previousPeriod.year;
    cursorMonth = previousPeriod.month;
  }

  return periods;
};

export const getDelta = (currentValue, previousValue) => {
  const current = Number(currentValue || 0);
  const previous = Number(previousValue || 0);
  const diff = current - previous;

  if (previous === 0) {
    return {
      diff,
      percent: current > 0 ? 100 : 0,
      trend: diff > 0 ? "up" : diff < 0 ? "down" : "flat",
    };
  }

  return {
    diff,
    percent: (diff / previous) * 100,
    trend: diff > 0 ? "up" : diff < 0 ? "down" : "flat",
  };
};

export const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Không thể tải dữ liệu doanh thu.";

export const buildInsightItems = (dashboard) => {
  if (!dashboard) return [];

  const { period, summary, metadata } = dashboard;
  const items = [
    {
      title: "Tỉ lệ chia doanh thu",
      description: `Artist nhận ${metadata?.revenueSharePercent?.artist || 0}% và nền tảng giữ ${metadata?.revenueSharePercent?.platform || 0}% doanh thu premium trong kỳ.`,
    },
  ];

  if (summary.undistributedArtistBalance > 0) {
    items.push({
      title: "Còn doanh thu artist chưa phân phối",
      description: `Hiện còn ${formatCurrency(summary.undistributedArtistBalance)} chưa được phân phối hoàn tất cho artist trong kỳ này.`,
    });
  }

  if (summary.successfulTransactions > 0) {
    const avgRevenue =
      Number(summary.premiumRevenue || 0) /
      Number(summary.successfulTransactions || 1);

    items.push({
      title: "Hiệu suất doanh thu mỗi giao dịch",
      description: `Trung bình mỗi giao dịch premium tạo ra khoảng ${formatCurrency(avgRevenue)} doanh thu trong kỳ.`,
    });
  }

  if (period.status === "not_created") {
    items.push({
      title: "Kỳ doanh thu chưa được khởi tạo",
      description:
        "Kỳ đã chọn chưa có bản ghi revenue period từ backend, nên cần kiểm tra cron hoặc job tổng hợp.",
    });
  }

  if (period.status === "open") {
    items.push({
      title: "Kỳ doanh thu vẫn đang mở",
      description:
        "Số liệu có thể còn tiếp tục tăng cho tới khi kỳ hiện tại được chốt và tính toán hoàn tất.",
    });
  }

  return items.slice(0, 3);
};
