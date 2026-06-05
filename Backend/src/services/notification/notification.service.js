import Notification from "../../models/Notification.js";

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

export default {
    getMyNotifications,
};
