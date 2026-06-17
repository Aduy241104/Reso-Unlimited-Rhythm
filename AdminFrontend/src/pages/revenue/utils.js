import { getRevenueDashboardService } from "../../services/revenueService";

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
  if (!value) return "Chua co";
  return new Date(value).toLocaleDateString("vi-VN");
};

export const formatDateTime = (value) => {
  if (!value) return "Chua co";
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
  "Khong the tai du lieu doanh thu.";

export const fetchRevenueSnapshots = async (year, month) => {
  const previousPeriod = getPreviousPeriod(year, month);
  const [currentData, previousData] = await Promise.all([
    getRevenueDashboardService(year, month),
    getRevenueDashboardService(previousPeriod.year, previousPeriod.month),
  ]);

  return { currentData, previousData };
};

export const buildInsightItems = (dashboard) => {
  if (!dashboard) return [];

  const { period, summary, metadata } = dashboard;
  const items = [
    {
      title: "Ti le chia doanh thu",
      description: `Artist nhan ${metadata?.revenueSharePercent?.artist || 0}% va nen tang giu ${metadata?.revenueSharePercent?.platform || 0}% doanh thu premium trong ky.`,
    },
  ];

  if (summary.pendingWithdrawalAmount > 0) {
    items.push({
      title: "Co yeu cau rut tien dang cho",
      description: `Dang co ${formatCurrency(summary.pendingWithdrawalAmount)} o trang thai cho xu ly.`,
    });
  }

  if (summary.artistAvailableBalance > 0) {
    items.push({
      title: "So du nghe si can theo doi",
      description: `Tong so du kha dung cua nghe si dang o muc ${formatCurrency(summary.artistAvailableBalance)}.`,
    });
  }

  if (period.status === "not_created") {
    items.push({
      title: "Ky doanh thu chua duoc khoi tao",
      description:
        "Ky da chon chua co ban ghi revenue period tu backend, nen can kiem tra cron hoac job tong hop.",
    });
  }

  return items.slice(0, 3);
};
