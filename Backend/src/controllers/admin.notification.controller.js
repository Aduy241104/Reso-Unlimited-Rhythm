import adminNotificationService from "../services/notification/admin.notification.service.js";
import formatResponse from "../utils/formatResponse.js";

const createNotificationForAdmin = async (req, res, next) => {
    try {
        // req.body lúc này đã sạch và được validate qua middleware bọc ở router
        const notificationData = req.body;
        
        // Giả định middleware requireAdmin gán thông tin admin vào req.user
        const adminId = req.user._id; 

        // Gọi tầng Service xử lý nghiệp vụ gửi thông báo
        const result = await adminNotificationService.createNotificationForAdmin(adminId, notificationData);

        // Chuẩn hóa câu thông báo theo cơ chế lưu trữ tập trung mới
        const messageTarget = notificationData.receiverType === "single" 
            ? "1 specific user" 
            : `the target ${notificationData.receiverType} group`;

        return formatResponse.success(
            res,
            { processedRecords: result.count },
            `Notification created and broadcasted to ${messageTarget} successfully.`
        );
    } catch (error) {
        next(error);
    }
};

export default {
    createNotificationForAdmin
};