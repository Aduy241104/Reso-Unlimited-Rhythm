import mongoose from "mongoose";
import Notification from "../../models/Notification.js";
import User from "../../models/User.js";
import { AppError } from "../../utils/AppError.js"; // Thay bằng file Error handler của ông


const attachTargetNames = async (notifications) => {
    const isArray = Array.isArray(notifications);
    const list = isArray ? notifications : [notifications];

    const updatedList = await Promise.all(
        list.map(async (notif) => {
            let targetName = "";
            if (notif.targetId && notif.targetType) {
                try {
                    // track -> Track, playlist -> Playlist
                    const modelName = notif.targetType.charAt(0).toUpperCase() + notif.targetType.slice(1);
                    const TargetModel = mongoose.models[modelName] || mongoose.model(modelName);

                    if (TargetModel) {
                        const targetDoc = await TargetModel.findById(notif.targetId).lean();
                        targetName = targetDoc?.title || targetDoc?.name || "Nội dung đã bị xóa";
                    }
                } catch (error) {
                    console.error("Lỗi lấy targetName:", error);
                    targetName = "Không xác định";
                }
            }
            return { ...notif, targetName };
        })
    );

    return isArray ? updatedList : updatedList[0];
};

const createNotificationForAdmin = async (adminId, data) => {
    const { title, content, type, receiverType, specificUserId, groupRole, targetId, targetType } = data;

    const baseData = {
        title: title.trim(),
        content: content.trim(),
        type,
        receiverType,
        actorId: adminId,
        actorType: "admin",
        createdBy: adminId,
        targetId: targetId ? new mongoose.Types.ObjectId(targetId) : null,
        targetType: targetType || "",
        readBy: [],
        deletedBy: []
    };

    if (receiverType === "single") {
        if (!mongoose.Types.ObjectId.isValid(specificUserId)) {
            throw new AppError("Invalid specific user id.", 400, { field: "specificUserId" });
        }
        const targetUser = await User.findById(specificUserId).lean();
        if (!targetUser) {
            throw new AppError("Recipient user not found.", 404, { field: "specificUserId" });
        }

        return await Notification.create({
            ...baseData,
            userId: specificUserId,
            isGlobal: false
        });
    }

    if (receiverType === "all") {
        return await Notification.create({
            ...baseData,
            isGlobal: true
        });
    }

    if (receiverType === "group") {
        return await Notification.create({
            ...baseData,
            targetRoles: [groupRole],
            isGlobal: false
        });
    }

    throw new AppError("Invalid receiver type execution.", 400);
};

const getNotificationsForAdmin = async () => {
    const list = await Notification.find().sort({ createdAt: -1 }).lean();
    return await attachTargetNames(list);
};

const getNotificationDetailForAdmin = async (notificationId) => {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
        throw new AppError("Invalid notification id format.", 400);
    }

    const notification = await Notification.findById(notificationId)
        .populate({ path: "userId", select: "email profile role activeStatus" })
        .populate({ path: "readBy", select: "email profile role" })
        .lean();

    if (!notification) {
        throw new AppError("Notification not found.", 404);
    }

    const notificationWithTarget = await attachTargetNames(notification);
    const viewCount = Array.isArray(notification.readBy) ? notification.readBy.length : 0;

    return {
        ...notificationWithTarget,
        viewCount
    };
};

const updateNotificationForAdmin = async (notificationId, data) => {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
        throw new AppError("Invalid notification id format.", 400);
    }

    const { title, content, type, targetId, targetType } = data;

    const notification = await Notification.findByIdAndUpdate(
        notificationId,
        {
            $set: {
                title: title.trim(),
                content: content.trim(),
                type,
                targetId: targetId ? new mongoose.Types.ObjectId(targetId) : null,
                targetType: targetType || ""
            }
        },
        { new: true, runValidators: true }
    )
        .populate({ path: "userId", select: "email profile role activeStatus" })
        .lean(); // 👈 BẮT BUỘC CÓ DÒNG NÀY ĐỂ SOCKET.IO KHÔNG BỊ LỖI SERIALIZE

    if (!notification) {
        throw new AppError("Notification not found or already deleted.", 404);
    }

    return notification;
};

const deleteNotificationForAdmin = async (notificationId) => {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
        throw new AppError("Invalid notification id format.", 400);
    }

    // Xóa khỏi DB và trả về đúng cục data vừa bị xóa
    const notification = await Notification.findByIdAndDelete(notificationId).lean();

    if (!notification) {
        throw new AppError("Notification not found or already deleted.", 404);
    }

    return notification;
};

// Đừng quên cập nhật object export default ở cuối file service:
export default {
    createNotificationForAdmin,
    getNotificationsForAdmin,
    getNotificationDetailForAdmin,
    updateNotificationForAdmin,
    deleteNotificationForAdmin,
};