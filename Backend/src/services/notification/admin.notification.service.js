import mongoose from "mongoose";
import Notification from "../../models/Notification.js";
import User from "../../models/User.js";
import { AppError } from "../../utils/AppError.js"; // Thay bằng file Error handler của ông

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

export default {
    createNotificationForAdmin
};