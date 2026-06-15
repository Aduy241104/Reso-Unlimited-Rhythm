import mongoose from "mongoose";
import Notification from "../../models/Notification.js";
import User from "../../models/User.js";
import { AppError } from "../../utils/AppError.js";

const createNotificationForAdmin = async (adminId, data) => {
    const { title, content, type, receiverType, specificUserId, groupRole, targetId, targetType } = data;

    // Cấu trúc nền phẳng cố định cho 1 record duy nhất
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
        readBy: [],      // Khởi tạo mảng trống để lưu các userId đã bấm đọc sau này
        deletedBy: []    // Khởi tạo mảng trống để lưu các userId đã bấm xóa sau này
    };

    // 1. TÌNH HUỐNG GỬI ĐƠN LẺ (Single)
    if (receiverType === "single") {
        if (!mongoose.Types.ObjectId.isValid(specificUserId)) {
            throw new AppError("Invalid specific user id.", 400, { field: "specificUserId" });
        }
        
        const targetUser = await User.findById(specificUserId).lean();
        if (!targetUser) {
            throw new AppError("Recipient user not found.", 404, { field: "specificUserId" });
        }

        await Notification.create({
            ...baseData,
            userId: specificUserId,
            isGlobal: false
        });
        return { success: true, count: 1 };
    }

    // 2. TÌNH HUỐNG GỬI TẤT CẢ (All) -> CHỈ TẠO ĐÚNG 1 RECORD
    if (receiverType === "all") {
        await Notification.create({
            ...baseData,
            isGlobal: true
        });
        return { success: true, count: 1 };
    }

    // 3. TÌNH HUỐNG GỬI THEO NHÓM (Group) -> CHỈ TẠO ĐÚNG 1 RECORD
    if (receiverType === "group") {
        await Notification.create({
            ...baseData,
            targetRoles: [groupRole], // Lưu nhãn phân quyền nhận tin (user hoặc artist)
            isGlobal: false
        });
        return { success: true, count: 1 };
    }

    throw new AppError("Invalid receiver type execution.", 400);
};

export default {
    createNotificationForAdmin
};