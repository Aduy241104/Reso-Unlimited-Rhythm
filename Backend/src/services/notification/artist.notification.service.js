import notificationService from "./notification.service.js";

const getMyArtistNotifications = async (userId, query = {}) =>
    notificationService.getMyNotifications(userId, query);

const getMyArtistNotificationDetail = async (userId, notificationId) =>
    notificationService.getMyNotificationDetail(userId, notificationId);

export default {
    getMyArtistNotifications,
    getMyArtistNotificationDetail,
};
