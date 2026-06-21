import mongoose from "mongoose";
import Artist from "../../models/Artist.js";
import Interaction from "../../models/Interaction.js";
import Notification from "../../models/Notification.js";
import User from "../../models/User.js";
import { AppError } from "../../utils/AppError.js";

const getThumbnailFromTarget = (targetDoc) => {
    if (!targetDoc) return "";
    if (Array.isArray(targetDoc.coverImage) && targetDoc.coverImage.length > 0) {
        return targetDoc.coverImage[0] || "";
    }
    return targetDoc.avatar || targetDoc.thumbnail || targetDoc.image || "";
};

const getTargetSnapshot = async (targetId, targetType) => {
    if (!targetId || !targetType) return {};

    try {
        const modelName = targetType.charAt(0).toUpperCase() + targetType.slice(1);
        const TargetModel = mongoose.models[modelName] || mongoose.model(modelName);
        const targetDoc = await TargetModel.findById(targetId).lean();

        return {
            targetName: targetDoc?.title || targetDoc?.name || "",
            thumbnail: getThumbnailFromTarget(targetDoc),
        };
    } catch (error) {
        return {};
    }
};

const attachTargetNames = async (notifications) => {
    const isArray = Array.isArray(notifications);
    const list = isArray ? notifications : [notifications];

    const updatedList = await Promise.all(
        list.map(async (notif) => {
            let targetName = notif.targetName || "";
            let thumbnail = notif.thumbnail || "";

            if (notif.targetId && notif.targetType) {
                try {
                    const modelName = notif.targetType.charAt(0).toUpperCase() + notif.targetType.slice(1);
                    const TargetModel = mongoose.models[modelName] || mongoose.model(modelName);
                    const targetDoc = await TargetModel.findById(notif.targetId).lean();

                    targetName = targetDoc?.title || targetDoc?.name || targetName || "Nội dung đã bị xóa";
                    thumbnail = getThumbnailFromTarget(targetDoc) || thumbnail;
                } catch (error) {
                    targetName = targetName || "Không xác định";
                }
            }

            return { ...notif, targetName, thumbnail };
        })
    );

    return isArray ? updatedList : updatedList[0];
};

const createNotificationForAdmin = async (adminId, data) => {
    const {
        title,
        content,
        type,
        receiverType,
        specificUserId,
        groupRole,
        artistId,
        targetId,
        targetType,
    } = data;

    const targetSnapshot = await getTargetSnapshot(targetId, targetType);
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
        targetName: targetSnapshot.targetName || "",
        thumbnail: targetSnapshot.thumbnail || "",
        sourceType: "admin_manual",
        readBy: [],
        deletedBy: [],
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
            isGlobal: false,
        });
    }

    if (receiverType === "all") {
        return await Notification.create({
            ...baseData,
            isGlobal: true,
        });
    }

    if (receiverType === "group") {
        return await Notification.create({
            ...baseData,
            targetRoles: [groupRole],
            isGlobal: false,
        });
    }

    if (receiverType === "followers") {
        if (!mongoose.Types.ObjectId.isValid(artistId)) {
            throw new AppError("Invalid artist id.", 400, { field: "artistId" });
        }

        const targetArtist = await Artist.findById(artistId).lean();
        if (!targetArtist) {
            throw new AppError("Artist not found.", 404, { field: "artistId" });
        }

        return await Notification.create({
            ...baseData,
            artistId,
            isGlobal: false,
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
        .populate({ path: "artistId", select: "name avatar" })
        .lean();

    if (!notification) {
        throw new AppError("Notification not found.", 404);
    }

    const notificationWithTarget = await attachTargetNames(notification);
    const viewCount = Array.isArray(notification.readBy) ? notification.readBy.length : 0;

    return {
        ...notificationWithTarget,
        viewCount,
    };
};

const updateNotificationForAdmin = async (notificationId, data) => {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
        throw new AppError("Invalid notification id format.", 400);
    }

    const { title, content, type, targetId, targetType } = data;
    const targetSnapshot = await getTargetSnapshot(targetId, targetType);

    const notification = await Notification.findByIdAndUpdate(
        notificationId,
        {
            $set: {
                title: title.trim(),
                content: content.trim(),
                type,
                targetId: targetId ? new mongoose.Types.ObjectId(targetId) : null,
                targetType: targetType || "",
                targetName: targetSnapshot.targetName || "",
                thumbnail: targetSnapshot.thumbnail || "",
            },
        },
        { new: true, runValidators: true }
    )
        .populate({ path: "userId", select: "email profile role activeStatus" })
        .lean();

    if (!notification) {
        throw new AppError("Notification not found or already deleted.", 404);
    }

    return notification;
};

const deleteNotificationForAdmin = async (notificationId) => {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
        throw new AppError("Invalid notification id format.", 400);
    }

    const notification = await Notification.findByIdAndDelete(notificationId).lean();

    if (!notification) {
        throw new AppError("Notification not found or already deleted.", 404);
    }

    return notification;
};

const getFollowerUserIdsForNotification = async (notification) => {
    if (notification?.receiverType !== "followers" || !notification.artistId) {
        return [];
    }

    const followers = await Interaction.find({
        targetType: "Artist",
        targetId: notification.artistId,
        action: "follow",
    })
        .select("userId")
        .lean();

    return followers.map((follower) => follower.userId).filter(Boolean);
};

export {
    getFollowerUserIdsForNotification,
};

export default {
    createNotificationForAdmin,
    getNotificationsForAdmin,
    getNotificationDetailForAdmin,
    updateNotificationForAdmin,
    deleteNotificationForAdmin,
    getFollowerUserIdsForNotification,
};
