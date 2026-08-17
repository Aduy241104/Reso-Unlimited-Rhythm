import { createPlaceholderImage, formatTrackDuration } from "./albumDetail";
import { getApiErrorFullMessage } from "./apiError";

export const TRACK_SCHEDULED_VISIBILITY_ERROR_MESSAGE =
  "Không thể thay đổi trạng thái hiển thị vì bài hát đang có lịch phát hành. Hãy hủy lịch phát hành trước, sau đó thử lại.";

const TRACK_SCHEDULED_VISIBILITY_ERROR_CODES = new Set([
  "RELEASE_SCHEDULE_CANCELLATION_REQUIRED",
]);

const getErrorPayload = (error) => error?.response?.data || error || {};

const getErrorDetails = (error) => {
  const details = getErrorPayload(error)?.errors;

  if (Array.isArray(details)) {
    return details;
  }

  if (details && typeof details === "object") {
    return [details];
  }

  return [];
};

const isReleaseScheduleVisibilityError = (error) => {
  const payload = getErrorPayload(error);
  const details = getErrorDetails(error);
  const errorCode = payload?.code || payload?.errorCode;

  if (TRACK_SCHEDULED_VISIBILITY_ERROR_CODES.has(errorCode)) {
    return true;
  }

  if (
    details.some((detail) =>
      TRACK_SCHEDULED_VISIBILITY_ERROR_CODES.has(detail?.code || detail?.errorCode)
    )
  ) {
    return true;
  }

  const messageText = [
    payload?.message,
    error?.message,
    ...details.map((detail) => detail?.message),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    messageText.includes("lịch phát hành") &&
    (messageText.includes("hiển thị") || messageText.includes("ẩn"))
  );
};

export const getTrackVisibilityActionErrorMessage = (error, fallbackMessage) =>
  isReleaseScheduleVisibilityError(error)
    ? TRACK_SCHEDULED_VISIBILITY_ERROR_MESSAGE
    : getApiErrorFullMessage(error, fallbackMessage);

export const ACTIVE_STATUS_META = {
  active: {
    label: "Đang phát hành",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  draft: {
    label: "Bản nháp",
    className: "border-slate-200 bg-slate-100 text-slate-600",
  },
  hidden: {
    label: "Đã ẩn",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  blocked: {
    label: "Bị chặn",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
};

export const APPROVAL_STATUS_META = {
  approved: {
    label: "Đã duyệt",
    className: "border-sky-200 bg-sky-50 text-sky-700",
  },
  pending: {
    label: "Chờ duyệt",
    className: "border-orange-200 bg-orange-50 text-orange-700",
  },
  rejected: {
    label: "Từ chối",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
  draft: {
    label: "Bản nháp",
    className: "border-slate-200 bg-slate-100 text-slate-600",
  },
};

export const RELEASE_STATUS_META = {
  unreleased: {
    label: "Chưa phát hành",
    className: "border-slate-200 bg-slate-100 text-slate-700",
  },
  scheduled: {
    label: "Đã lên lịch",
    className: "border-violet-200 bg-violet-50 text-violet-700",
  },
  released: {
    label: "Đã phát hành",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
};

export const getTrackActiveStatusMeta = (value) =>
  ACTIVE_STATUS_META[value] || ACTIVE_STATUS_META.draft;

export const getTrackApprovalStatusMeta = (value) =>
  APPROVAL_STATUS_META[value] || APPROVAL_STATUS_META.draft;

export const getTrackReleaseStatusMeta = (value) =>
  RELEASE_STATUS_META[value] || RELEASE_STATUS_META.unreleased;

export const isTrackReleaseScheduled = (track) =>
  track?.releaseStatus === "scheduled";

export const isTrackReleased = (track) =>
  track?.releaseStatus === "released";

export const formatTrackCount = (value) =>
  new Intl.NumberFormat("vi-VN").format(Number(value) || 0);

export const formatTrackDate = (value) => {
  if (!value) {
    return "Chưa cập nhật";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Chưa cập nhật";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

export const formatTrackDateTime = (value) => {
  if (!value) {
    return "Chưa cập nhật";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Chưa cập nhật";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export const formatTrackReleaseLabel = (value) => {
  if (!value) {
    return "Chưa có album";
  }

  return value;
};

const getFirstImageUrl = (value) => {
  if (Array.isArray(value)) {
    return value.find(Boolean) || "";
  }

  return value || "";
};

export const resolveTrackArtwork = (track, fallbackLabel = "Bài hát") =>
  getFirstImageUrl(track?.coverImage) ||
  getFirstImageUrl(track?.avatar) ||
  getFirstImageUrl(track?.album?.avatar) ||
  createPlaceholderImage(
    track?.title || fallbackLabel,
    "#8b5cf6",
    "#221b4d"
  );

export const resolveTrackAvatarArtwork = (track, fallbackLabel = "Bài hát") =>
  getFirstImageUrl(track?.avatar) ||
  getFirstImageUrl(track?.album?.avatar) ||
  createPlaceholderImage(
    track?.title || fallbackLabel,
    "#8b5cf6",
    "#221b4d"
  );

export const getTrackGenreLabel = (track) => {
  const genres = Array.isArray(track?.genres) ? track.genres : [];

  if (genres.length === 0) {
    return "Chưa có thể loại";
  }

  return genres
    .map((genre) => genre?.name)
    .filter(Boolean)
    .join(", ");
};

export const getTrackAlbumLabel = (track) => track?.album?.title || "Chưa có album";

export const getTrackDisplayDuration = (value) => formatTrackDuration(value);

export const getTrackReleaseYearLabel = (value) => {
  if (!value) {
    return "Chưa có ngày";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Chưa có ngày";
  }

  return String(date.getFullYear());
};
