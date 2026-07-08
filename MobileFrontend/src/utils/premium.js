const PREMIUM_FEATURE_LABELS = {
  NO_ADS: 'Không bị chèn quảng cáo',
  HIGH_QUALITY_AUDIO: 'Chất lượng âm thanh cao',
  LOSSLESS_AUDIO: 'Nghe nhạc lossless',
  UNLIMITED_SKIP: 'Bỏ qua bài hát không giới hạn',
  OFFLINE_DOWNLOAD: 'Tải nhạc để nghe offline',
  BACKGROUND_PLAY: 'Phát nhạc nền',
  AI_SMART_PLAYLIST: 'Playlist AI thông minh',
  ADVANCED_RECOMMENDATION: 'Đề xuất nâng cao',
  EARLY_ACCESS: 'Truy cập sớm',
  EXCLUSIVE_CONTENT: 'Nội dung độc quyền',
};

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

export const formatPremiumPrice = (value) => {
  const amount = Number(value) || 0;

  try {
    return currencyFormatter.format(amount);
  } catch (error) {
    return `${amount.toLocaleString('vi-VN')} VND`;
  }
};

export const formatPremiumDate = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  try {
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch (error) {
    return date.toLocaleString('vi-VN');
  }
};

export const formatDurationDays = (value) => {
  const durationDays = Number(value) || 0;

  if (durationDays <= 0) {
    return 'Không xác định';
  }

  if (durationDays % 30 === 0) {
    const monthCount = durationDays / 30;
    return `${monthCount} tháng`;
  }

  return `${durationDays} ngày`;
};

export const getPremiumFeatureLabel = (featureCode) => PREMIUM_FEATURE_LABELS[featureCode] || featureCode || 'Tính năng';

export const isSamePlan = (leftPlanId, rightPlanId) =>
  Boolean(leftPlanId) && Boolean(rightPlanId) && String(leftPlanId) === String(rightPlanId);

export const resolveCurrentPlanId = (subscription) =>
  subscription?.currentPlan?._id ||
  subscription?.currentPlan?.originalPlanId ||
  subscription?.activeSubscription?.plan?._id ||
  subscription?.activeSubscription?.plan?.originalPlanId ||
  subscription?.activeSubscription?.planId ||
  '';
