import axiosClient from "../axios/axiosClient";

const ADMIN_NOTIFICATION_PREFIX = "/api/admin/notifications";

export const createAdminNotificationService = async (data) => {
    /* data gửi lên gồm: 
       { title, content, type, receiverType, specificUserId, groupRole, targetId, targetType }
    */
    const response = await axiosClient.post(`${ADMIN_NOTIFICATION_PREFIX}`, data);
    return response?.data ?? response;
};

export const getAdminNotificationsService = async (params = {}) => {
  const response = await axiosClient.get(ADMIN_NOTIFICATION_PREFIX, { params });
  return response?.data?.data || response?.data;
};

export default {
    createAdminNotificationService,
    getAdminNotificationsService
};