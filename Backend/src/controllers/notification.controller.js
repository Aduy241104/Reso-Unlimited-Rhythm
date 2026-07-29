import notificationService from "../services/notification/notification.service.js";
import formatResponse from "../utils/formatResponse.js";

const getMyNotifications = async (req, res, next) => {
    try {
        const { notifications, meta } = await notificationService.getMyNotifications(
            req.user.id,
            req.query
        );

        return formatResponse.success(
            res,
            { notifications },
            "Notifications fetched successfully",
            meta
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getMyNotifications,
};
