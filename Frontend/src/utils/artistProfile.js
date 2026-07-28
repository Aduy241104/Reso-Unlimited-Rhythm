const FALLBACK_MONTHLY_LISTENERS = 1979510;
const FALLBACK_FOLLOWERS = 850234;

export const formatCompactNumber = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "0";
  }

  return new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    maximumFractionDigits: numericValue >= 1000000 ? 1 : 0,
  }).format(numericValue);
};

export const formatFullNumber = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "0";
  }

  return new Intl.NumberFormat("vi-VN").format(numericValue);
};

export const formatDuration = (durationInSeconds) => {
  const totalSeconds = Number(durationInSeconds);

  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return "0:00";
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

export const createMonogram = (name = "Nghệ sĩ") => {
  const words = String(name).trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "AR";
  }

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
};

export const createPlaceholderImage = (
  label = "Nghệ sĩ",
  startColor = "#1db954",
  endColor = "#101010"
) => {
  const monogram = createMonogram(label);
  const safeLabel = String(label).slice(0, 24).toUpperCase();
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${startColor}" />
          <stop offset="100%" stop-color="${endColor}" />
        </linearGradient>
      </defs>
      <rect width="1200" height="1200" fill="url(#bg)" />
      <circle cx="980" cy="180" r="180" fill="rgba(255,255,255,0.07)" />
      <circle cx="180" cy="1020" r="240" fill="rgba(255,255,255,0.06)" />
      <text x="50%" y="48%" text-anchor="middle" dominant-baseline="middle" fill="rgba(255,255,255,0.95)" font-size="240" font-family="Arial, sans-serif" font-weight="700">${monogram}</text>
      <text x="50%" y="78%" text-anchor="middle" fill="rgba(255,255,255,0.62)" font-size="48" font-family="Arial, sans-serif" letter-spacing="16">${safeLabel}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export const createProfileFallbacks = (artistName = "Nghệ sĩ không xác định") => {
  return {
    avatar: createPlaceholderImage(artistName, "#2f855a", "#0f0f0f"),
    banner: createPlaceholderImage(artistName, "#383838", "#090909"),
    aboutImage: createPlaceholderImage(artistName, "#1f1f1f", "#0f766e"),
  };
};

export const getMetricValue = (candidate, fallbackValue) => {
  const numericValue = Number(candidate);
  return Number.isFinite(numericValue) && numericValue >= 0
    ? numericValue
    : fallbackValue;
};

export const defaultArtistMetrics = {
  monthlyListeners: FALLBACK_MONTHLY_LISTENERS,
  followers: FALLBACK_FOLLOWERS,
};
