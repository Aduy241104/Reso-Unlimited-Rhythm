import axiosClient from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/apiEndpoints';

const getPayload = (response) => response?.data || response || {};

export const notificationService = {
  async getMyNotifications(params = {}) {
    const response = await axiosClient.get(API_ENDPOINTS.NOTIFICATIONS.LIST, { params });
    const payload = getPayload(response);

    return {
      notifications: payload?.notifications || [],
      meta: payload?.meta || {
        page: params.page || 1,
        limit: params.limit || 10,
        total: 0,
        totalPages: 0,
        unreadCount: 0,
      },
    };
  },

  async getNotificationDetail(id) {
    const response = await axiosClient.get(`${API_ENDPOINTS.NOTIFICATIONS.DETAIL}/${id}`);
    const payload = getPayload(response);

    return payload?.notification || null;
  },

  async markAsRead(id) {
    return await axiosClient.patch(`${API_ENDPOINTS.NOTIFICATIONS.MARK_AS_READ}/${id}/mark-as-read`);
  },

  async deleteNotification(id) {
    return await axiosClient.delete(`${API_ENDPOINTS.NOTIFICATIONS.DELETE}/${id}`);
  },
};

export default notificationService;
