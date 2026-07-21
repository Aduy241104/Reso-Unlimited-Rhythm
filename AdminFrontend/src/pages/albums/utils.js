export const ALBUM_STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "draft", label: "Nháp" },
  { value: "active", label: "Đang hiển thị" },
  { value: "hidden", label: "Đã ẩn" },
  { value: "blocked", label: "Đã chặn" },
];

const albumStatusMap = {
  draft: {
    label: "Nháp",
    className: "bg-slate-100 text-slate-700 ring-slate-200",
  },
  active: {
    label: "Đang hiển thị",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  hidden: {
    label: "Đã ẩn",
    className: "bg-amber-50 text-amber-800 ring-amber-200",
  },
  blocked: {
    label: "Đã chặn",
    className: "bg-rose-50 text-rose-700 ring-rose-200",
  },
};

const artistStatusMap = {
  active: {
    label: "Hoạt động",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  inactive: {
    label: "Tạm ngưng",
    className: "bg-slate-100 text-slate-700 ring-slate-200",
  },
  blocked: {
    label: "Đã chặn",
    className: "bg-rose-50 text-rose-700 ring-rose-200",
  },
};

const trackApprovalStatusMap = {
  draft: {
    label: "Nháp",
    className: "bg-slate-100 text-slate-700 ring-slate-200",
  },
  pending: {
    label: "Chờ duyệt",
    className: "bg-amber-50 text-amber-800 ring-amber-200",
  },
  approved: {
    label: "Đã duyệt",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  rejected: {
    label: "Từ chối",
    className: "bg-rose-50 text-rose-700 ring-rose-200",
  },
};

const trackActiveStatusMap = {
  draft: {
    label: "Nháp",
    className: "bg-slate-100 text-slate-700 ring-slate-200",
  },
  active: {
    label: "Đang hiển thị",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  hidden: {
    label: "Đã ẩn",
    className: "bg-amber-50 text-amber-800 ring-amber-200",
  },
  blocked: {
    label: "Đã chặn",
    className: "bg-rose-50 text-rose-700 ring-rose-200",
  },
};

const formatBadge = (statusMap, value) =>
  statusMap[value] || {
    label: value || "-",
    className: "bg-slate-100 text-slate-700 ring-slate-200",
  };

export const getAlbumStatusBadge = (value) => formatBadge(albumStatusMap, value);
export const getArtistStatusBadge = (value) =>
  formatBadge(artistStatusMap, value);
export const getTrackApprovalStatusBadge = (value) =>
  formatBadge(trackApprovalStatusMap, value);
export const getTrackActiveStatusBadge = (value) =>
  formatBadge(trackActiveStatusMap, value);

export const formatDate = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

export const formatDateTime = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "-";

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, remainingSeconds]
      .map((value, index) =>
        index === 0 ? String(value) : String(value).padStart(2, "0")
      )
      .join(":");
  }

  return [minutes, remainingSeconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
};

export const formatNumber = (value) => {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString("vi-VN");
};

export const getInitials = (value = "") => {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "AL";

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
};

export const replaceAlbumById = (albums = [], nextAlbum) =>
  albums.map((album) => (album?.id === nextAlbum?.id ? nextAlbum : album));
