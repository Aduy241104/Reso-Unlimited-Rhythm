import userNotificationService from "../services/notification/user.notification.service.js";
import formatResponse from "../utils/formatResponse.js";

const getMyNotifications = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role; // Lấy role "user" hoặc "artist" từ token gán ở middleware auth

        const result = await userNotificationService.getMyNotifications(userId, userRole, req.query);

        return formatResponse.success(
            res,
            result,
            "Fetch user notification list successfully."
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getMyNotifications
};