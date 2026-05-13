export const createPlaceholderImage = (
  label,
  startColor = "#f59e0b",
  endColor = "#111827"
) => {
  const safeLabel = label || "Album";
  const firstLetter = safeLabel.charAt(0).toUpperCase();
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${startColor}" />
          <stop offset="100%" stop-color="${endColor}" />
        </linearGradient>
      </defs>
      <rect width="600" height="600" fill="url(#bg)" />
      <circle cx="500" cy="120" r="120" fill="rgba(255,255,255,0.08)" />
      <circle cx="120" cy="520" r="170" fill="rgba(255,255,255,0.08)" />
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="220" font-family="Arial, sans-serif" font-weight="700">${firstLetter}</text>
      <text x="50%" y="82%" text-anchor="middle" fill="rgba(255,255,255,0.78)" font-size="42" font-family="Arial, sans-serif" letter-spacing="8">${safeLabel.toUpperCase()}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export const formatTrackDuration = (durationInSeconds) => {
  const totalSeconds = Number(durationInSeconds);

  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return "--:--";
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

export const formatAlbumDuration = (tracks = []) => {
  const totalSeconds = tracks.reduce((sum, item) => {
    const value = Number(item?.track?.duration);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);

  if (totalSeconds <= 0) {
    return "Unknown duration";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  }

  return `${minutes} min ${seconds} sec`;
};

export const formatReleaseYear = (releaseDate) => {
  if (!releaseDate) {
    return "Unknown year";
  }

  const date = new Date(releaseDate);

  if (Number.isNaN(date.getTime())) {
    return "Unknown year";
  }

  return String(date.getFullYear());
};
