const PREMIUM_TEXT_MARKERS = [
  "premium",
  "pro",
  "vip",
  "plus",
  "gold",
  "paid",
];

const normalizeText = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const hasPremiumMarker = (value) => {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return false;
  }

  return PREMIUM_TEXT_MARKERS.some((marker) => normalizedValue.includes(marker));
};

export const hasPremiumAccess = (user) => {
  if (!user || typeof user !== "object") {
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
