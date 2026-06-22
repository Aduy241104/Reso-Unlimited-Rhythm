import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import Artist from "../../models/Artist.js";
import Interaction from "../../models/Interaction.js";
import Notification from "../../models/Notification.js"; 
import { AppError } from "../../utils/AppError.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const normalizePositiveInteger = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return (Number.isNaN(parsed) || parsed < 1) ? fallback : parsed;
};

// 🔥 HÀM HELPER: Tự động quét DB tìm tên thực thể (Bài hát, Playlist...) dựa theo targetType và targetId
const attachTargetNamesToNotifications = async (notifications) => {
    const isArray = Array.isArray(notifications);
    const list = isArray ? notifications : [notifications];

    const updatedList = await Promise.all(
        list.map(async (doc) => {
            let targetName = "";
            if (doc.targetId && doc.targetType) {
                try {
                    // Chuẩn hóa chữ cái đầu để khớp với tên các Model định nghĩa trong mongoose (ví dụ: track -> Track, playlist -> Playlist)
                    const modelName = doc.targetType.charAt(0).toUpperCase() + doc.targetType.slice(1);
                    const TargetModel = mongoose.models[modelName] || mongoose.model(modelName);

                    if (TargetModel) {
                        const targetDoc = await TargetModel.findById(doc.targetId).lean();
                        // Lấy linh hoạt theo trường 'title' (bài hát/album) hoặc 'name' (nghệ sĩ/playlist)
                        targetName = targetDoc?.title || targetDoc?.name || "Nội dung không khả dụng";
                    }
                } catch (error) {
                    console.error("⚠️ Lỗi tự động map targetName cho người dùng:", error);
                    targetName = "";
                }
            }
            return { ...doc, targetName }; // Trả thêm thuộc tính targetName vào object
        })
    );

    return isArray ? updatedList : updatedList[0];
};

const attachArtistNamesToNotifications = async (notifications) => {
    const isArray = Array.isArray(notifications);
    const list = isArray ? notifications : [notifications];
    const artistIds = [
        ...new Set(
            list
                .map((doc) => doc.artistId)
                .filter(Boolean)
                .map((artistId) => artistId.toString())
        ),
    ];

    if (artistIds.length === 0) {
        return isArray ? list : list[0];
    }

    const artists = await Artist.find({ _id: { $in: artistIds } })
        .select("_id name")
        .lean();
    const artistNameById = artists.reduce((map, artist) => {
        map[String(artist._id)] = artist.name || "";
        return map;
    }, {});

    const updatedList = list.map((doc) => ({
        ...doc,
        artistName: artistNameById[String(doc.artistId)] || "",
    }));

    return isArray ? updatedList : updatedList[0];
};

const getFollowedArtistIds = async (userId) => {
    const follows = await Interaction.find({
        userId,
        targetType: "Artist",
        action: "follow",
    })
        .select("targetId")
        .lean();

    return follows.map((follow) => follow.targetId).filter(Boolean);
};

const buildNotificationFilter = (userId, userRole, query = {}, followedArtistIds = []) => {
    const filter = {
        deletedBy: { $ne: userId },
        $or: [
            { userId, isDeleted: false },
            { isGlobal: true },
            { targetRoles: userRole },
            { receiverType: "followers", artistId: { $in: followedArtistIds } },
        ],
    };

    if (query.type) {
        filter.type = query.type;
    }

    let isReadParam = undefined;
    if (query.isRead === "true" || query.isRead === true) isReadParam = true;
    if (query.isRead === "false" || query.isRead === false) isReadParam = false;

    if (isReadParam !== undefined) {
        if (isReadParam) {
            filter.$or = [
                { userId, isRead: true, isDeleted: false },
                { isGlobal: true, readBy: userId },
                { targetRoles: userRole, readBy: userId },
                { receiverType: "followers", artistId: { $in: followedArtistIds }, readBy: userId }
            ];
        } else {
            filter.$or = [
                { userId, isRead: false, isDeleted: false },
                { isGlobal: true, readBy: { $ne: userId } },
                { targetRoles: userRole, readBy: { $ne: userId } },
                { receiverType: "followers", artistId: { $in: followedArtistIds }, readBy: { $ne: userId } }
            ];
        }
    }

    return filter;
};

// 2. Lấy danh sách thông báo có phân trang + đếm số lượng chưa đọc thực tế
const getMyNotifications = async (userId, userRole, query = {}, isAdminView = false) => {
    const page = normalizePositiveInteger(query.page, DEFAULT_PAGE);
    const requestedLimit = normalizePositiveInteger(query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;
    const followedArtistIds = await getFollowedArtistIds(userId);

    const baseFilter = buildNotificationFilter(userId, userRole, query, followedArtistIds);

    const filter = {
        ...baseFilter,
        deletedBy: { $ne: userId } 
    };

    const unreadFilter = {
        ...buildNotificationFilter(userId, userRole, { type: query.type }, followedArtistIds),
        deletedBy: { $ne: userId }
    };

    unreadFilter.$or = [
        { receiverType: "single", userId, isRead: false, isDeleted: false },
        { receiverType: "all", isGlobal: true, readBy: { $ne: userId } },
        { receiverType: "group", targetRoles: userRole, readBy: { $ne: userId } },
        { receiverType: "followers", artistId: { $in: followedArtistIds }, readBy: { $ne: userId } }
    ];

    const [notificationsDocs, total, unreadCount] = await Promise.all([
        Notification.find(filter)
            .sort({ createdAt: -1, _id: -1 })
            .skip(skip)
            .limit(limit)
            .select("-__v -deletedAt -createdBy")
            .lean(),
        Notification.countDocuments(filter),
        Notification.countDocuments(unreadFilter), // Trả về con số chưa đọc chính xác sau khi xóa
    ]);

    const notifications = notificationsDocs.map(doc => {
        let isRead = doc.isRead;
        if (doc.receiverType === "all" || doc.receiverType === "group" || doc.receiverType === "followers") {
            isRead = Array.isArray(doc.readBy) && doc.readBy.some(id => id?.toString() === userId?.toString());
        }

        if (!isAdminView) {
            delete doc.readBy;
            delete doc.deletedBy;
            delete doc.targetRoles;
        }

        return { ...doc, isRead };
    });

    const notificationsWithTargetNames = await attachTargetNamesToNotifications(notifications);
    const notificationsWithNames = await attachArtistNamesToNotifications(notificationsWithTargetNames);

    return {
        notifications: notificationsWithNames,
        meta: {
            page,
            limit,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
            unreadCount,
        },
    };
};

// 3. Lấy chi tiết thông báo và tự động chuyển trạng thái thành "Đã đọc" khi xem
const getMyNotificationDetail = async (id, userId, isAdminView = false) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError("Mã định danh thông báo không hợp lệ.", StatusCodes.BAD_REQUEST);
    }

    const notification = await Notification.findById(id);
    if (!notification) {
        throw new AppError("Không tìm thấy thông báo.", StatusCodes.NOT_FOUND);
    }

    if (notification.receiverType === "single") {
        if (!notification.isRead) {
            notification.isRead = true;
            await notification.save();
        }
    } else if (["all", "group", "followers"].includes(notification.receiverType)) {
        await Notification.findByIdAndUpdate(id, {
            $addToSet: { readBy: userId }
        });
    }

    const result = notification.toObject ? notification.toObject() : notification;
    delete result.__v;
    delete result.deletedAt;
    delete result.createdBy;

    if (!isAdminView) {
        delete result.readBy;
        delete result.deletedBy;
        delete result.targetRoles;
    }

    // 🔥 TÍCH HỢP TẠI ĐÂY: Tìm tên thật cho bản ghi chi tiết trước khi trả về Client
    const notificationWithTargetName = await attachTargetNamesToNotifications(result);
    return await attachArtistNamesToNotifications(notificationWithTargetName);
};

// 4. Logic xử lý riêng cho chức năng bấm nút "Đánh dấu đã đọc" từ khay thông báo
const markNotificationAsRead = async (id, userId) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError("Mã định danh thông báo không hợp lệ.", StatusCodes.BAD_REQUEST);
    }

    const notification = await Notification.findById(id);
    if (!notification) {
        throw new AppError("Không tìm thấy thông báo để cập nhật.", StatusCodes.NOT_FOUND);
    }

    if (notification.receiverType === "single") {
        notification.isRead = true;
        await notification.save();
    } else {
        await Notification.findByIdAndUpdate(id, {
            $addToSet: { readBy: userId }
        });
    }
    return true;
};

const deleteNotification = async (id, userId) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError("Mã định danh thông báo không hợp lệ.", StatusCodes.BAD_REQUEST);
    }

    const notification = await Notification.findById(id);
    if (!notification) {
        throw new AppError("Không tìm thấy thông báo để xóa.", StatusCodes.NOT_FOUND);
    }

    // Nếu là thông báo cá nhân (single), có thể bật hẳn flag isDeleted
    if (notification.receiverType === "single") {
        notification.isDeleted = true;
    }
    
    // Luôn luôn đẩy userId vào danh sách deletedBy để bộ lọc tự ẩn đi với user này
    if (!notification.deletedBy.includes(userId)) {
        notification.deletedBy.push(userId);
    }

    await notification.save();
    return true;
};

export default {
    getMyNotifications,
    getMyNotificationDetail,
    markNotificationAsRead,
    deleteNotification
};
