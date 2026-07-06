const PREMIUM_FEATURE_LABELS = {
  NO_ADS: 'Khong bi chen quang cao',
  HIGH_QUALITY_AUDIO: 'Chat luong am thanh cao',
  LOSSLESS_AUDIO: 'Nghe nhac lossless',
  UNLIMITED_SKIP: 'Bo qua bai hat khong gioi han',
  OFFLINE_DOWNLOAD: 'Tai nhac de nghe offline',
  BACKGROUND_PLAY: 'Phat nhac nen',
  AI_SMART_PLAYLIST: 'Playlist AI thong minh',
  ADVANCED_RECOMMENDATION: 'De xuat nang cao',
  EARLY_ACCESS: 'Truy cap som',
  EXCLUSIVE_CONTENT: 'Noi dung doc quyen',
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
    return 'Khong xac dinh';
  }

  if (durationDays % 30 === 0) {
    const monthCount = durationDays / 30;
    return `${monthCount} thang`;
  }

  return `${durationDays} ngay`;
};

export const getPremiumFeatureLabel = (featureCode) => PREMIUM_FEATURE_LABELS[featureCode] || featureCode || 'Tinh nang';

export const isSamePlan = (leftPlanId, rightPlanId) =>
  Boolean(leftPlanId) && Boolean(rightPlanId) && String(leftPlanId) === String(rightPlanId);

export const resolveCurrentPlanId = (subscription) =>
  subscription?.currentPlan?._id ||
  subscription?.currentPlan?.originalPlanId ||
  subscription?.activeSubscription?.plan?._id ||
  subscription?.activeSubscription?.plan?.originalPlanId ||
  subscription?.activeSubscription?.planId ||
  '';
