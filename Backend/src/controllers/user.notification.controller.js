import userNotificationService from "../services/notification/user.notification.service.js";
import formatResponse from "../utils/formatResponse.js";

const getMyNotifications = async (req, res, next) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const userRole = req.user?.role;
        const isAdminView = userRole === 'admin';

        const result = await userNotificationService.getMyNotifications(
            userId,
            userRole,
            req.query,
            isAdminView
        );

        return formatResponse.success(
            res, 
            { notifications: result.notifications, meta: result.meta }, 
            "Fetch notifications successfully"
        );
    } catch (error) {
        next(error);
    }
};

const getNotificationDetail = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?._id || req.user?.id;
        const userRole = req.user?.role;
        const isAdminView = userRole === 'admin';

        const notification = await userNotificationService.getMyNotificationDetail(id, userId, isAdminView);

        return formatResponse.success(res, { notification }, "Fetch notification detail successfully");
    } catch (error) {
        next(error);
    }
};

const markAsRead = async (req, res, next) => {
    try {
        const { id } = req.params; 
        const userId = req.user?._id || req.user?.id;

        await userNotificationService.markNotificationAsRead(id, userId);

        return formatResponse.success(res, null, "Đã đánh dấu thông báo là đã đọc");
    } catch (error) {
        next(error);
    }
};

const deleteNotification = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?._id || req.user?.id;

        await userNotificationService.deleteNotification(id, userId);

        return formatResponse.success(res, null, "Xóa thông báo thành công.");
    } catch (error) {
        next(error);
    }
};

export default {
    getMyNotifications,
    getNotificationDetail,
    markAsRead,
    deleteNotification
};