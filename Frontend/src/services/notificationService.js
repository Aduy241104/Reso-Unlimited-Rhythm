import axiosClient from "../axios/axiosClient";

const NOTIFICATION_API_PREFIX = "/api/user/notifications";

export const getMyNotificationsService = async (params = {}) => {
    const response = await axiosClient.get(NOTIFICATION_API_PREFIX, { params });
    const payload = response?.data?.data;

    return {
        notifications: payload?.notifications ?? [],
        meta: payload?.meta ?? null, // Chứa page, limit, unreadCount... từ backend trả về
    };
};
export const getNotificationDetailService = async (id) => {
    const response = await axiosClient.get(`${NOTIFICATION_API_PREFIX}/${id}`);
    return response?.data?.data?.notification;
};

export const markNotificationAsReadService = async (id) => {
    const response = await axiosClient.patch(`${NOTIFICATION_API_PREFIX}/${id}/mark-as-read`);
    return response?.data?.data?.notification;
}

export const deleteNotificationService = async (id) => {
    const response = await axiosClient.delete(`${NOTIFICATION_API_PREFIX}/${id}`);
    return response.data;
};