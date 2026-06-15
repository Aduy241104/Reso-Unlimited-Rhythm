import notificationService from "./notification.service.js";

const getMyArtistNotifications = async (userId, query = {}) =>
    notificationService.getMyNotifications(userId, query);

export default {
    getMyArtistNotifications,
};
