import { createPlaceholderImage } from "../../utils/albumDetail";

export const verificationBadgeClass = {
  verified: "bg-[#f3ebe3] text-[#5c3d24]",
  pending: "bg-neutral-100 text-neutral-600",
  rejected: "bg-red-50 text-red-800",
};

export const activeStatusBadgeClass = {
  active: "bg-[#f3ebe3] text-[#6f4a2c]",
  inactive: "bg-neutral-100 text-neutral-600",
  blocked: "bg-red-50 text-red-800",
};

export const formatCount = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return "—";
  }
  return n.toLocaleString();
};

export const formatDate = (value) => {
  if (!value) {
    return "—";
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return "—";
  }
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const getCoverSrc = (artist) => {
  if (!artist?.name) {
    return createPlaceholderImage("Artist", "#8b5e3c", "#2a2019");
  }
  return artist.coverImage || createPlaceholderImage(artist.name, "#8b5e3c", "#2a2019");
};

export const getAvatarSrc = (artist) => {
  if (!artist?.name) {
    return createPlaceholderImage("A", "#c49a6c", "#2a2019");
  }
  return artist.avatar || createPlaceholderImage(artist.name, "#c49a6c", "#2a2019");
};
