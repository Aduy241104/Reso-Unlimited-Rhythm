const PREMIUM_FEATURE_LABELS = {
  UNLIMITED_PLAYLISTS: 'Tạo playlist và thêm bài hát không giới hạn',
  ACTIVITY_ANALYTICS: 'Xem phân tích hoạt động',
  AUDIO_QUALITY_OPTIONS: 'Tùy chọn chất lượng âm thanh',
  FREE_SEEK: 'Tua nhạc tự do',
  NO_ADS: 'Không bị chèn quảng cáo',
  HIGH_QUALITY_AUDIO: 'Chất lượng âm thanh cao',
  LOSSLESS_AUDIO: 'Nghe nhạc lossless',
  UNLIMITED_SKIP: 'Chuyển bài không giới hạn',
  OFFLINE_DOWNLOAD: 'Tải nhạc để nghe offline',
  BACKGROUND_PLAY: 'Phát nhạc nền',
  AI_SMART_PLAYLIST: 'Playlist AI thông minh',
  ADVANCED_RECOMMENDATION: 'Đề xuất nâng cao',
  EARLY_ACCESS: 'Truy cập sớm',
  EXCLUSIVE_CONTENT: 'Nội dung độc quyền',
};

export const PREMIUM_BENEFITS = [
  'UNLIMITED_PLAYLISTS',
  'ACTIVITY_ANALYTICS',
  'AUDIO_QUALITY_OPTIONS',
  'UNLIMITED_SKIP',
  'FREE_SEEK',
];

const PREMIUM_TEXT_MARKERS = ['premium', 'pro', 'vip', 'plus', 'gold', 'paid'];

const hasPremiumMarker = (value) => {
  const normalizedValue = typeof value === 'string' ? value.trim().toLowerCase() : '';

  return Boolean(
    normalizedValue && PREMIUM_TEXT_MARKERS.some((marker) => normalizedValue.includes(marker))
  );
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

export const hasPremiumAccess = (user) => {
  if (!user || typeof user !== 'object') {
    return false;
  }

  const booleanCandidates = [
    user.isPremium,
    user.premium,
    user.profile?.isPremium,
    user.profile?.premium,
    user.subscription?.isPremium,
    user.membership?.isPremium,
    user.plan?.isPremium,
  ];

  if (booleanCandidates.some((value) => value === true)) {
    return true;
  }

  const textCandidates = [
    user.accountType,
    user.plan,
    user.premiumType,
    user.subscriptionType,
    user.profile?.accountType,
    user.profile?.plan,
    user.subscription?.plan,
    user.subscription?.tier,
    user.subscription?.type,
    user.membership?.tier,
    user.membership?.type,
  ];

  return textCandidates.some(hasPremiumMarker);
};

export const isSamePlan = (leftPlanId, rightPlanId) =>
  Boolean(leftPlanId) && Boolean(rightPlanId) && String(leftPlanId) === String(rightPlanId);

export const resolveCurrentPlanId = (subscription) =>
  subscription?.currentPlan?._id ||
  subscription?.currentPlan?.originalPlanId ||
  subscription?.activeSubscription?.plan?._id ||
  subscription?.activeSubscription?.plan?.originalPlanId ||
  subscription?.activeSubscription?.planId ||
  '';
