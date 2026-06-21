import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import Notification from "../../models/Notification.js";
import { AppError } from "../../utils/AppError.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const normalizePositiveInteger = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);

    if (Number.isNaN(parsed) || parsed < 1) {
        return fallback;
    }

    return parsed;
};

const buildArtistNotificationFilter = (userId, userRole, query = {}) => {
    const baseFilter = {
        deletedBy: { $ne: userId },
    };

    if (query.type) {
        baseFilter.type = query.type;
    }

    let isReadFilter;

    if (query.isRead === "true" || query.isRead === true) {
        isReadFilter = true;
    }

    if (query.isRead === "false" || query.isRead === false) {
        isReadFilter = false;
    }

    if (isReadFilter === true) {
        return {
            ...baseFilter,
            $or: [
                {
                    receiverType: "single",
                    userId,
                    isDeleted: false,
                    isRead: true,
                },
                {
                    receiverType: "all",
                    isGlobal: true,
                    readBy: userId,
                },
                {
                    receiverType: "group",
                    targetRoles: userRole,
                    readBy: userId,
                },
            ],
        };
    }

    if (isReadFilter === false) {
        return {
            ...baseFilter,
            $or: [
                {
                    receiverType: "single",
                    userId,
                    isDeleted: false,
                    isRead: false,
                },
                {
                    receiverType: "all",
                    isGlobal: true,
                    readBy: { $ne: userId },
                },
                {
                    receiverType: "group",
                    targetRoles: userRole,
                    readBy: { $ne: userId },
                },
            ],
        };
    }

    return {
        ...baseFilter,
        $or: [
            {
                receiverType: "single",
                userId,
                isDeleted: false,
            },
            {
                receiverType: "all",
                isGlobal: true,
            },
            {
                receiverType: "group",
                targetRoles: userRole,
            },
        ],
    };
};

const sanitizeArtistNotification = (notification, userId) => {
    const isRead =
        notification.receiverType === "single"
            ? Boolean(notification.isRead)
            : Array.isArray(notification.readBy) &&
            notification.readBy.some((id) => id?.toString() === userId?.toString());

    const sanitizedNotification = {
        ...notification,
        isRead,
    };

    delete sanitizedNotification.__v;
    delete sanitizedNotification.deletedAt;
    delete sanitizedNotification.createdBy;
    delete sanitizedNotification.readBy;
    delete sanitizedNotification.deletedBy;
    delete sanitizedNotification.targetRoles;

    return sanitizedNotification;
};

const ensureNotificationId = (notificationId) => {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
        throw new AppError("Invalid request data.", StatusCodes.BAD_REQUEST);
    }

    return notificationId;
};

const getMyArtistNotifications = async (userId, userRole, query = {}) => {
    const page = normalizePositiveInteger(query.page, DEFAULT_PAGE);
    const requestedLimit = normalizePositiveInteger(query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;
    const filter = buildArtistNotificationFilter(userId, userRole, query);
    const unreadFilter = buildArtistNotificationFilter(userId, userRole, {
        type: query.type,
        isRead: false,
    });

    const [notifications, total, unreadCount] = await Promise.all([
        Notification.find(filter)
            .sort({ createdAt: -1, _id: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Notification.countDocuments(filter),
        Notification.countDocuments(unreadFilter),
    ]);

    return {
        notifications: notifications.map((notification) =>
            sanitizeArtistNotification(notification, userId)
        ),
        meta: {
            page,
            limit,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
            unreadCount,
        },
    };
};

const getMyArtistNotificationDetail = async (userId, userRole, notificationId) => {
    const normalizedNotificationId = ensureNotificationId(notificationId);
    const filter = {
        ...buildArtistNotificationFilter(userId, userRole),
        _id: normalizedNotificationId,
    };

    const notification = await Notification.findOne(filter).lean();

    if (!notification) {
        throw new AppError("Notification not found.", StatusCodes.NOT_FOUND);
    }

    const isSingleReceiver = notification.receiverType === "single";
    const hasReadByUser =
        Array.isArray(notification.readBy) &&
        notification.readBy.some((id) => id?.toString() === userId?.toString());

    if (isSingleReceiver && !notification.isRead) {
        await Notification.updateOne(
            { _id: normalizedNotificationId, isRead: false },
            {
                $set: {
                    isRead: true,
                },
            }
        );

        return sanitizeArtistNotification(
            {
                ...notification,
                isRead: true,
            },
            userId
        );
    }

    if (!isSingleReceiver && !hasReadByUser) {
        await Notification.updateOne(
            { _id: normalizedNotificationId },
            {
                $addToSet: {
                    readBy: userId,
                },
            }
        );

        return sanitizeArtistNotification(
            {
                ...notification,
                readBy: [...(notification.readBy || []), userId],
            },
            userId
        );
    }

    return sanitizeArtistNotification(notification, userId);
};

export default {
    getMyArtistNotifications,
    getMyArtistNotificationDetail,
};
