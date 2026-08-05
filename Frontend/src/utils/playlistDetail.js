export const formatPlaylistDuration = (durationInSeconds) => {
  const rawTotalSeconds = Number(durationInSeconds);

  if (!Number.isFinite(rawTotalSeconds) || rawTotalSeconds <= 0) {
    return "";
  }

  const totalSeconds = Math.floor(rawTotalSeconds);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours} giờ ${minutes} phút`;
  }

  if (minutes > 0) {
    return `${minutes} phút ${seconds} giây`;
  }

  return `${seconds} giây`;
};

export const formatPlaylistDate = (value) => {
  if (!value) {
    return "";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const getPlaylistOwnerLabel = (playlist) =>
  playlist?.owner?.fullName || playlist?.owner?.email || "";
