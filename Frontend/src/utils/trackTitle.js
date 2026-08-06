const normalizeTrackTitlePart = (value) =>
  typeof value === "string" ? value.trim() : "";

export const formatTrackTitle = (title, versionTitle = "") => {
  const normalizedTitle = normalizeTrackTitlePart(title);
  const normalizedVersionTitle = normalizeTrackTitlePart(versionTitle);

  if (!normalizedVersionTitle) {
    return normalizedTitle;
  }

  const versionSuffix = `(${normalizedVersionTitle})`;

  if (
    normalizedTitle === versionSuffix ||
    normalizedTitle.endsWith(` ${versionSuffix}`)
  ) {
    return normalizedTitle;
  }

  return normalizedTitle
    ? `${normalizedTitle} ${versionSuffix}`
    : versionSuffix;
};

export const getTrackDisplayTitle = (track, fallback = "") =>
  formatTrackTitle(
    track?.title || track?.name || track?.trackName || fallback,
    track?.versionTitle
  );
