import axiosClient from "../../axios/axiosClient";

const REPORT_API_PREFIX = "/api/users/reports";

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
