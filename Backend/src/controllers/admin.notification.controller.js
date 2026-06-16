import adminNotificationService from "../services/notification/admin.notification.service.js";
import formatResponse from "../utils/formatResponse.js";

const createNotificationForAdmin = async (req, res, next) => {
    try {
        const notificationData = req.body;
        const adminId = req.user._id; 

        // 1. Tạo bản ghi duy nhất trong DB
        const notification = await adminNotificationService.createNotificationForAdmin(adminId, notificationData);

        // 2. Lấy cụm io để bắn Realtime phát một ăn ngay
        const io = req.app.get("io"); 

        if (io) {
            if (notification.receiverType === "single") {
                io.to(notification.userId.toString()).emit("new_notification", notification);
            } 
            else if (notification.receiverType === "group") {
                const targetGroup = notification.targetRoles[0];
                io.to(targetGroup).emit("new_notification", notification);
            } 
            else if (notification.receiverType === "all") {
                io.emit("new_notification", notification);
            }
        }

        const messageTarget = notification.receiverType === "single" 
            ? "1 specific user" 
            : `the target ${notification.receiverType} group`;

        return formatResponse.success(
            res,
            notification,
            `Notification created and broadcasted via socket to ${messageTarget} successfully.`
        );
    } catch (error) {
        next(error);
    }
};

const getNotificationsForAdmin = async (req, res, next) => {
    try {
        const notifications = await adminNotificationService.getNotificationsForAdmin();
        
        return formatResponse.success(
            res,
            { notifications },
            "Fetch list of admin notifications successfully."
        );
    } catch (error) {
        next(error);
    }
};

export default {
    createNotificationForAdmin,
    getNotificationsForAdmin
};