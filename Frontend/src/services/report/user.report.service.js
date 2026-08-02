import axiosClient from "../../axios/axiosClient";

const REPORT_API_PREFIX = "/api/users/reports";
const normalizeMessage = (value) => String(value || "").trim().toLowerCase();

export const translateReportError = (
  error,
  fallback = "Không thể gửi báo cáo vào lúc này."
) => {
  const backendMessage = error?.response?.data?.message || error?.message || "";
  const normalizedMessage = normalizeMessage(backendMessage);

  const dictionary = {
    "invalid report data.": "Thông tin báo cáo chưa hợp lệ.",
    "invalid report data": "Thông tin báo cáo chưa hợp lệ.",
    "report not found.": "Không tìm thấy báo cáo.",
    "report not found": "Không tìm thấy báo cáo.",
    "you already have an open report for this content. please wait until it is processed before reporting it again.":
      "Bạn đã gửi báo cáo cho nội dung này và đang chờ admin xử lý. Chỉ có thể báo cáo lại sau khi report hiện tại đã được xử lý.",
  };

  return dictionary[normalizedMessage] || backendMessage || fallback;
};

export const createReportService = async (payload = {}) => {
  const formData = new FormData();

  const appendIfValid = (key, value) => {
    if (value !== undefined && value !== null) {
      formData.append(key, typeof value === "string" ? value.trim() : value);
    }
  };

  appendIfValid("targetId", payload.targetId);
  appendIfValid("targetType", payload.targetType);
  appendIfValid("reason", payload.reason);
  appendIfValid("description", payload.description);

  if (Array.isArray(payload.images)) {
    payload.images.forEach((image) => {
      if (image) {
        formData.append("images", image);
      }
    });
  }

  const response = await axiosClient.post(REPORT_API_PREFIX, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response?.data?.data?.report ?? null;
};
