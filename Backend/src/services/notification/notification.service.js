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

const buildNotificationFilter = (userId, query = {}) => {
    const filter = {
        isDeleted: false,
        $or: [
            { userId },
            { isGlobal: true, receiverType: "all" },
        ],
    };

    if (query.type) {
        filter.type = query.type;
    }

    if (typeof query.isRead === "boolean") {
        filter.isRead = query.isRead;
    }

    return filter;
};

const ensureNotificationId = (notificationId) => {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
        throw new AppError("Invalid request data.", StatusCodes.BAD_REQUEST);
    }

    return notificationId;
};

const getMyNotifications = async (userId, query = {}) => {
    const page = normalizePositiveInteger(query.page, DEFAULT_PAGE);
    const requestedLimit = normalizePositiveInteger(query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;
    const filter = buildNotificationFilter(userId, query);

    const unreadFilter = {
        ...buildNotificationFilter(userId, { type: query.type }),
        isRead: false,
    };

    const [notifications, total, unreadCount] = await Promise.all([
        Notification.find(filter)
            .sort({ createdAt: -1, _id: -1 })
            .skip(skip)
            .limit(limit)
            .select("-__v -deletedAt -createdBy")
            .lean(),
        Notification.countDocuments(filter),
        Notification.countDocuments(unreadFilter),
    ]);

    return {
        notifications,
        meta: {
            page,
            limit,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
            unreadCount,
        },
    };
};

const getMyNotificationDetail = async (userId, notificationId) => {
    const normalizedNotificationId = ensureNotificationId(notificationId);
    const filter = {
        ...buildNotificationFilter(userId),
        _id: normalizedNotificationId,
    };

    const notification = await Notification.findOne(filter)
        .select("-__v -deletedAt -createdBy")
        .lean();

    if (!notification) {
        throw new AppError("Notification not found.", StatusCodes.NOT_FOUND);
    }

    if (!notification.isRead) {
        await Notification.updateOne(
            { _id: normalizedNotificationId, isRead: false },
            {
                $set: {
                    isRead: true,
                },
            }
        );

        return {
            ...notification,
            isRead: true,
        };
    }

    return notification;
};

export default {
    getMyNotifications,
    getMyNotificationDetail,
};
