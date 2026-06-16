import axiosClient from "../axios/axiosClient";

const NOTIFICATION_API_PREFIX = "/api/notifications";

export const getMyNotificationsService = async (params = {}) => {
  const response = await axiosClient.get(NOTIFICATION_API_PREFIX, { params });
  const payload = response?.data?.data;

  return {
    notifications: payload?.notifications ?? [],
    meta: payload?.meta ?? null, // Chứa page, limit, unreadCount... từ backend trả về
  };
};
