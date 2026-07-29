import { REVIEW_CRITERIA } from "./constants";

export const getStatusClasses = (status) => {
  switch (status) {
    case "approved":
      return "bg-emerald-100 text-emerald-800";
    case "rejected":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-amber-100 text-amber-800";
  }
};

export const getStatusLabel = (status) => {
  if (status === "approved") return "Đã duyệt";
  if (status === "rejected") return "Đã từ chối";
  return "Chờ duyệt";
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

export const formatDate = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

export const buildInitialReviewForm = (artistRequest) => {
  const hasExistingReview = Boolean(
    artistRequest?.reviewedAt ||
      artistRequest?.reviewedBy?._id ||
      artistRequest?.status === "rejected" ||
      artistRequest?.status === "approved"
  );

  const checklist = REVIEW_CRITERIA.reduce((result, item) => {
    result[item.key] = hasExistingReview
      ? artistRequest?.review?.checklist?.[item.key] === true
      : null;
    return result;
  }, {});

  return {
    adminNote: artistRequest?.review?.adminNote || "",
    rejectReason: artistRequest?.rejectReason || "",
    checklist,
  };
};

export const getReviewChecklistDisplayValue = (artistRequest, key) => {
  const hasReview = Boolean(
    artistRequest?.reviewedAt ||
      artistRequest?.reviewedBy?._id ||
      artistRequest?.status !== "pending"
  );

  if (!hasReview) {
    return null;
  }

  return artistRequest?.review?.checklist?.[key] === true;
};
