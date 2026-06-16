import Notification from "../../models/Notification.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const normalizePositiveInteger = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return (Number.isNaN(parsed) || parsed < 1) ? fallback : parsed;
};

const buildNotificationFilter = (userId, userRole, query = {}) => {
    const filter = {
        deletedBy: { $ne: userId },
        $or: [
            { userId, isDeleted: false },
            { isGlobal: true },
            { targetRoles: userRole },
        ],
    };

    if (query.type) filter.type = query.type;

    if (typeof query.isRead === "boolean") {
        if (query.isRead) {
            filter.$or = [
                { userId, isRead: true, isDeleted: false },
                { isGlobal: true, readBy: userId },
                { targetRoles: userRole, readBy: userId }
            ];
        } else {
            filter.$or = [
                { userId, isRead: false, isDeleted: false },
                { isGlobal: true, readBy: { $ne: userId } },
                { targetRoles: userRole, readBy: { $ne: userId } }
            ];
        }
    }
    return filter;
};

const getMyNotifications = async (userId, userRole, query = {}) => {
    const page = normalizePositiveInteger(query.page, DEFAULT_PAGE);
    const requestedLimit = normalizePositiveInteger(query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;
    
    const filter = buildNotificationFilter(userId, userRole, query);
    const unreadFilter = buildNotificationFilter(userId, userRole, { type: query.type, isRead: false });

    const [notificationsDocs, total, unreadCount] = await Promise.all([
        Notification.find(filter)
            .sort({ createdAt: -1, _id: -1 })
            .skip(skip)
            .limit(limit)
            .select("-__v -deletedAt -createdBy")
            .lean(),
        Notification.countDocuments(filter),
        Notification.countDocuments(unreadFilter),
    ]);

    const notifications = notificationsDocs.map(doc => {
        let isRead = doc.isRead;
        if (doc.receiverType === "all" || doc.receiverType === "group") {
            isRead = Array.isArray(doc.readBy) && doc.readBy.some(id => id.toString() === userId.toString());
        }
        delete doc.readBy;
        delete doc.deletedBy;
        delete doc.targetRoles;
        return { ...doc, isRead };
    });

    return {
        notifications,
        meta: { page, limit, total, totalPages: total === 0 ? 0 : Math.ceil(total / limit), unreadCount },
    };
};

export default {
    getMyNotifications
};