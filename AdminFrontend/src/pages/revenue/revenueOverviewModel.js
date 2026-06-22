import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  formatPeriodLabel,
} from "./utils";

export const REVENUE_ACTIONS = {
  close: {
    key: "close",
    title: "Chốt kỳ",
    description:
      "Khóa dữ liệu doanh thu premium và stream hợp lệ để chuẩn bị bước tính phân bổ.",
    buttonLabel: "Chốt kỳ doanh thu",
    successMessage:
      "Kỳ doanh thu đã được chốt thành công. Bạn có thể tiếp tục tính phân bổ khi đã sẵn sàng.",
  },
  calculate: {
    key: "calculate",
    title: "Tính phân bổ",
    description:
      "Tổng hợp quỹ nghệ sĩ và phân chia doanh thu theo lượng stream hợp lệ trong kỳ.",
    buttonLabel: "Tính phân bổ doanh thu",
    successMessage:
      "Phân bổ doanh thu đã được tính lại thành công và dữ liệu trên trang đã được làm mới.",
  },
  confirm: {
    key: "confirm",
    title: "Xác nhận phân bổ",
    description:
      "Khóa kết quả phân bổ và xác nhận phần doanh thu sẽ được ghi nhận cho nghệ sĩ.",
    buttonLabel: "Xác nhận phân bổ",
    successMessage:
      "Kết quả phân bổ đã được xác nhận thành công và kỳ doanh thu đã chuyển sang trạng thái hoàn tất.",
  },
};

export const normalizeOverviewData = (overview, chartsData) => {
  const period = overview?.period ?? null;
  const summary = overview?.summary ?? {};
  const lifecycleTimestamps = overview?.lifecycleTimestamps ?? {};
  const distribution = overview?.distribution ?? null;
  const availableActions = Array.isArray(overview?.availableActions)
    ? overview.availableActions
    : [];
  const confirmedBy = overview?.confirmedBy ?? null;
  const charts = chartsData?.charts ?? { monthly: [], last14Days: [] };
  const metadata = chartsData?.metadata ?? {
    revenueSharePercent: { artist: 0, platform: 0 },
    lastUpdatedAt: null,
  };

  return {
    period,
    summary,
    lifecycleTimestamps,
    distribution,
    availableActions,
    confirmedBy,
    charts,
    metadata,
  };
};

export const getRevenuePeriodLabel = (period) =>
  period?.label ||
  (period?.year && period?.month
    ? formatPeriodLabel(period.year, period.month)
    : "Kỳ hiện tại");

export const isActionAvailable = (availableActions, actionKey) =>
  Array.isArray(availableActions) && availableActions.includes(actionKey);

export const buildWorkflowSteps = (lifecycleTimestamps, availableActions) => {
  const isClosed = Boolean(
    lifecycleTimestamps?.closedAt ||
      lifecycleTimestamps?.calculatedAt ||
      lifecycleTimestamps?.confirmedAt
  );
  const isCalculated = Boolean(
    lifecycleTimestamps?.calculatedAt || lifecycleTimestamps?.confirmedAt
  );
  const isConfirmed = Boolean(lifecycleTimestamps?.confirmedAt);

  return [
    {
      key: "close",
      title: REVENUE_ACTIONS.close.title,
      description: REVENUE_ACTIONS.close.description,
      state: isClosed
        ? "completed"
        : isActionAvailable(availableActions, "close")
          ? "active"
          : "pending",
      timestamp: lifecycleTimestamps?.closedAt ?? null,
    },
    {
      key: "calculate",
      title: REVENUE_ACTIONS.calculate.title,
      description: REVENUE_ACTIONS.calculate.description,
      state: isCalculated
        ? "completed"
        : isActionAvailable(availableActions, "calculate")
          ? "active"
          : "pending",
      timestamp: lifecycleTimestamps?.calculatedAt ?? null,
    },
    {
      key: "confirm",
      title: REVENUE_ACTIONS.confirm.title,
      description: REVENUE_ACTIONS.confirm.description,
      state: isConfirmed
        ? "completed"
        : isActionAvailable(availableActions, "confirm")
          ? "active"
          : "pending",
      timestamp: lifecycleTimestamps?.confirmedAt ?? null,
    },
  ];
};

export const buildLifecycleItems = (lifecycleTimestamps, confirmedBy) => {
  const items = [
    {
      key: "created",
      label: "Tạo bản ghi kỳ",
      value: lifecycleTimestamps?.createdAt ?? null,
      helper: "Hệ thống khởi tạo kỳ doanh thu hiện tại.",
    },
    {
      key: "aggregated",
      label: "Tổng hợp dữ liệu gần nhất",
      value: lifecycleTimestamps?.lastAggregatedAt ?? null,
      helper: "Mốc đồng bộ doanh thu premium và stream hợp lệ gần nhất.",
    },
    {
      key: "closed",
      label: "Chốt kỳ doanh thu",
      value: lifecycleTimestamps?.closedAt ?? null,
      helper: "Dữ liệu trong kỳ đã được khóa để tính phân bổ.",
    },
    {
      key: "calculated",
      label: "Tính phân bổ",
      value: lifecycleTimestamps?.calculatedAt ?? null,
      helper: "Hệ thống đã tính phân bổ doanh thu cho nghệ sĩ.",
    },
    {
      key: "confirmed",
      label: "Xác nhận phân bổ",
      value: lifecycleTimestamps?.confirmedAt ?? null,
      helper: confirmedBy
        ? `Người xác nhận: ${getConfirmedByName(confirmedBy)}.`
        : "Phân bổ đã được xác nhận trên hệ thống.",
    },
    {
      key: "updated",
      label: "Cập nhật cuối",
      value: lifecycleTimestamps?.updatedAt ?? null,
      helper: "Mốc cập nhật dữ liệu mới nhất từ backend.",
    },
  ];

  return items.filter((item) => item.value);
};

export const getConfirmedByName = (confirmedBy) =>
  confirmedBy?.fullName ||
  confirmedBy?.name ||
  confirmedBy?.username ||
  confirmedBy?.email ||
  "Chưa xác nhận";

export const buildActionResultItems = (actionKey, result) => {
  if (!result) {
    return [];
  }

  switch (actionKey) {
    case "close":
      return [
        {
          key: "premiumRevenue",
          label: "Doanh thu premium",
          value: formatCurrency(result.totalPremiumRevenue),
        },
        {
          key: "artistPool",
          label: "Quỹ nghệ sĩ",
          value: formatCurrency(result.totalArtistPool),
        },
        {
          key: "platformRevenue",
          label: "Doanh thu nền tảng",
          value: formatCurrency(result.totalPlatformRevenue),
        },
        {
          key: "eligibleStreams",
          label: "Stream hợp lệ",
          value: formatNumber(result.totalEligibleStreams),
        },
      ];
    case "calculate":
      return [
        {
          key: "artistSummaryCount",
          label: "Bản ghi nghệ sĩ đã cập nhật",
          value: formatNumber(result.artistSummaryCount),
        },
        {
          key: "trackRevenueCount",
          label: "Bản ghi doanh thu bài hát đã cập nhật",
          value: formatNumber(result.trackRevenueCount),
        },
      ];
    case "confirm":
      return [
        {
          key: "confirmedArtistCount",
          label: "Nghệ sĩ đã xác nhận",
          value: formatNumber(result.confirmedArtistCount),
        },
        {
          key: "totalConfirmedAmount",
          label: "Tổng tiền đã xác nhận",
          value: formatCurrency(result.totalConfirmedAmount),
        },
      ];
    default:
      return [];
  }
};

export const getArtistStatusLabel = (status) => {
  switch (status) {
    case "confirmed":
      return "Đã xác nhận";
    case "calculated":
      return "Đã tính";
    default:
      return "Đang xử lý";
  }
};

export const getArtistBadgeTone = (status) => {
  switch (status) {
    case "confirmed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "calculated":
      return "border-sky-200 bg-sky-50 text-sky-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
};

export const getVerificationStatusLabel = (status) => {
  switch (status) {
    case "verified":
      return "Đã xác minh";
    case "pending":
      return "Chờ xác minh";
    case "rejected":
      return "Đã từ chối";
    default:
      return status ? String(status) : "Chưa rõ";
  }
};

export const getActiveStatusLabel = (status) => {
  switch (status) {
    case "active":
      return "Đang hoạt động";
    case "inactive":
      return "Ngừng hoạt động";
    case "suspended":
      return "Tạm khóa";
    default:
      return status ? String(status) : "Chưa rõ";
  }
};

export const getWorkflowStateTone = (state) => {
  switch (state) {
    case "completed":
      return {
        badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
        ring: "border-emerald-200 bg-emerald-50",
        dot: "bg-emerald-500",
        label: "Đã hoàn tất",
      };
    case "active":
      return {
        badge: "border-sky-200 bg-sky-50 text-sky-700",
        ring: "border-sky-200 bg-sky-50",
        dot: "bg-sky-500",
        label: "Sẵn sàng xử lý",
      };
    default:
      return {
        badge: "border-slate-200 bg-slate-100 text-slate-600",
        ring: "border-slate-200 bg-white",
        dot: "bg-slate-300",
        label: "Đang chờ",
      };
  }
};

export const getDistributionSummary = (distribution) => [
  {
    key: "distributedArtistCount",
    label: "Nghệ sĩ được phân bổ",
    value: formatNumber(distribution?.distributedArtistCount),
    helper: "Số nghệ sĩ có doanh thu được chia trong kỳ này.",
  },
  {
    key: "distributedArtistRevenueAmount",
    label: "Tổng doanh thu chia cho nghệ sĩ",
    value: formatCurrency(distribution?.distributedArtistRevenueAmount),
    helper: "Tổng số tiền đã được phân bổ cho toàn bộ nghệ sĩ.",
  }
];

export const getOverviewHeadline = (summary, distribution, metadata) => {
  const artistPercent = metadata?.revenueSharePercent?.artist || 0;
  const platformPercent = metadata?.revenueSharePercent?.platform || 0;

  if (distribution) {
    return `Kỳ này đã ghi nhận ${formatCurrency(summary?.premiumRevenue)} doanh thu premium, trong đó ${formatCurrency(distribution?.distributedArtistRevenueAmount)} được phân bổ cho nghệ sĩ theo tỷ lệ ${artistPercent}% / ${platformPercent}%.`;
  }

  return `Kỳ hiện tại đang theo dõi ${formatCurrency(summary?.premiumRevenue)} doanh thu premium. Khi chốt kỳ xong, hệ thống sẽ phân bổ theo tỷ lệ ${artistPercent}% cho nghệ sĩ và ${platformPercent}% cho nền tảng.`;
};

export const formatLifecycleValue = (value) => formatDateTime(value);
