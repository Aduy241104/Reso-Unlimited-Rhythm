import axiosClient from "../axios/axiosClient";

const ADMIN_NOTIFICATION_API_PREFIX = "/api/admin/notifications";

export const createAdminNotificationService = async (data) => {
    /* data gửi lên gồm: 
       { title, content, type, receiverType, specificUserId, groupRole, targetId, targetType }
    */
    const response = await axiosClient.post(`${ADMIN_NOTIFICATION_API_PREFIX}`, data);
    return response?.data ?? response;
};

export default {
    createAdminNotificationService,
};