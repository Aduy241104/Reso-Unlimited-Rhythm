import mongoose from "mongoose";
import User from "../../models/User.js";
import Artist from "../../models/Artist.js";
import Album from "../../models/Album.js";
import Track from "../../models/Track.js";
import ArtistRequest from "../../models/ArtistRequest.js";
import AuditLog from "../../models/AuditLog.js";
import { AppError } from "../../utils/AppError.js";
import { recordAuditEvent } from "../audit/auditLog.service.js";

const getUsers = async (query) => {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.max(1, parseInt(query.limit) || 20);
    const q = (query.q || "").trim();

    const filter = { isDeleted: { $ne: true } };

    if (q) {
        const regex = new RegExp(q, "i");
        filter.$or = [
            { email: regex },
            { "profile.fullName": regex },
        ];
    }

    if (query.role) {
        filter.role = query.role;
    }

    if (query.activeStatus) {
        filter.activeStatus = query.activeStatus;
    }

    const total = await User.countDocuments(filter);

    const users = await User.find(filter)
        .select("-password")
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 });

    const meta = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    };

    return { users, meta };
};

const getUserDetail = async (id) => {
    const user = await User.findById(id).select("-password");
    return user;
};

const MODERATION_AUDIT_ACTIONS = [
    "TRACK_APPROVED",
    "TRACK_REJECTED",
    "ARTIST_REQUEST_APPROVED",
    "ARTIST_REQUEST_REJECTED",
];

const getUserModerationAudit = async (id) => {
    if (!mongoose.isValidObjectId(id)) {
        throw new AppError("User id is invalid.", 400);
    }

    const user = await User.findById(id).select("role").lean();
    if (!user) throw new AppError("User does not exist.", 404);
    if (user.role !== "admin") return [];

    const logs = await AuditLog.find({
        actorUserId: id,
        action: { $in: MODERATION_AUDIT_ACTIONS },
    })
        .sort({ occurredAt: -1, _id: -1 })
        .limit(100)
        .lean();

    const trackIds = logs.filter((item) => item.targetType === "track").map((item) => item.targetId);
    const artistRequestIds = logs
        .filter((item) => item.targetType === "artist_request")
        .map((item) => item.targetId);
    const [tracks, artistRequests] = await Promise.all([
        Track.find({ _id: { $in: trackIds } }).select("title").lean(),
        ArtistRequest.find({ _id: { $in: artistRequestIds } }).select("stageName").lean(),
    ]);
    const trackNames = new Map(tracks.map((item) => [String(item._id), item.title || "Bài hát"]));
    const artistNames = new Map(artistRequests.map((item) => [String(item._id), item.stageName || "Hồ sơ nghệ sĩ"]));

    return logs.map((item) => ({
        id: String(item._id),
        action: item.action,
        targetType: item.targetType,
        targetId: item.targetId ? String(item.targetId) : "",
        targetName: item.targetType === "track"
            ? (trackNames.get(String(item.targetId)) || "Bài hát đã xóa")
            : (artistNames.get(String(item.targetId)) || "Hồ sơ nghệ sĩ đã xóa"),
        decision: item.action.endsWith("APPROVED") ? "approved" : "rejected",
        reason: item.metadata?.reason || item.metadata?.rejectReason || "",
        occurredAt: item.occurredAt || item.createdAt,
        eventHash: item.eventHash,
    }));
};

const updateUser = async (id, body = {}, actorAdminId) => {
    if (!mongoose.isValidObjectId(id)) {
        throw new AppError("User id is invalid.", 400);
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
        throw new AppError("User does not exist.", 404);
    }

    const isSelfUpdate = actorAdminId && mongoose.isValidObjectId(actorAdminId)
        ? String(actorAdminId) === String(targetUser._id)
        : false;

    if (isSelfUpdate && body.activeStatus === "blocked") {
        throw new AppError("An admin cannot block their own account.", 403);
    }

    if (
        isSelfUpdate &&
        typeof body.role !== "undefined" &&
        targetUser.role === "admin" &&
        body.role !== "admin"
    ) {
        throw new AppError("An admin cannot demote their own account.", 403);
    }

    const demotesOrDisablesAdmin =
        targetUser.role === "admin" &&
        targetUser.activeStatus === "active" &&
        ((typeof body.role !== "undefined" && body.role !== "admin") ||
            (typeof body.activeStatus !== "undefined" && body.activeStatus !== "active"));

    if (demotesOrDisablesAdmin) {
        const activeAdminCount = await User.countDocuments({
            role: "admin",
            activeStatus: "active",
            isDeleted: { $ne: true },
        });

        if (activeAdminCount <= 1) {
            throw new AppError("The last active admin cannot be demoted or disabled.", 409);
        }
    }

    const updates = {};

    if (typeof body.role !== "undefined") {
        updates.role = body.role;
    }

    if (typeof body.activeStatus !== "undefined") {
        updates.activeStatus = body.activeStatus;
        updates.blockReason = body.activeStatus === "blocked"
            ? (body.blockReason || "Vi phạm điều khoản")
            : "";
    }

    if (typeof body.fullName !== "undefined") {
        updates["profile.fullName"] = body.fullName;
    }

    const user = await User.findByIdAndUpdate(id, { $set: updates }, {
        new: true,
        runValidators: true,
    }).select("-password");

    void recordAuditEvent({
        actorUserId: actorAdminId,
        action: "admin.user.update",
        targetType: "user",
        targetId: id,
        metadata: { changedFields: Object.keys(updates) },
    }).catch(() => null);

    return user;
};

const restoreUser = async (id) => {
    if (!mongoose.isValidObjectId(id)) {
        throw new AppError("User id is invalid.", 400);
    }

    const user = await User.findById(id);
    if (!user) throw new AppError("User does not exist.", 404);
    if (user.isDeleted !== true) {
        throw new AppError("User is not deleted.", 409);
    }

    const artist = await Artist.findOne({ userId: user._id });
    if (artist) {
        await Promise.all([
            Track.updateMany(
                { artist_artistId: artist._id, isDeleted: true },
                { $set: { isDeleted: false, deletedAt: null, deletedBy: null, deleteReason: "", activeStatus: "draft" } }
            ),
            Album.updateMany(
                { artistId: artist._id, isDeleted: true },
                { $set: { isDeleted: false, deletedAt: null, deletedBy: null, deleteReason: "", status: "draft" } }
            ),
            Artist.updateOne(
                { _id: artist._id },
                { $set: { isDeleted: false, deletedAt: null, deletedBy: null, deleteReason: "", activeStatus: "active" } }
            ),
        ]);
    }

    return User.findByIdAndUpdate(
        id,
        { $set: { isDeleted: false, deletedAt: null, deletedBy: null, deleteReason: "", activeStatus: "active" } },
        { new: true, runValidators: true }
    ).select("-password");
};

const softDeleteUserForAdmin = async (id, actorAdminId) => {
    if (!mongoose.isValidObjectId(id)) {
        throw new AppError("User id is invalid.", 400);
    }

    if (String(id) === String(actorAdminId)) {
        throw new AppError("An admin cannot delete their own account from this operation.", 403);
    }

    const user = await User.findById(id);
    if (!user) throw new AppError("User does not exist.", 404);
    if (user.isDeleted === true) throw new AppError("User is already deleted.", 409);

    if (user.role === "admin" && user.activeStatus === "active") {
        const activeAdminCount = await User.countDocuments({
            role: "admin",
            activeStatus: "active",
            isDeleted: { $ne: true },
        });
        if (activeAdminCount <= 1) {
            throw new AppError("The last active admin cannot be deleted.", 409);
        }
    }

    const now = new Date();
    const artist = await Artist.findOne({ userId: user._id, isDeleted: { $ne: true } });
    if (artist) {
        await Promise.all([
            Track.updateMany(
                { artist_artistId: artist._id, isDeleted: { $ne: true } },
                { $set: { isDeleted: true, deletedAt: now, deletedBy: actorAdminId, deleteReason: "Deleted by admin", activeStatus: "hidden" } }
            ),
            Album.updateMany(
                { artistId: artist._id, isDeleted: { $ne: true } },
                { $set: { isDeleted: true, deletedAt: now, deletedBy: actorAdminId, deleteReason: "Deleted by admin", status: "hidden" } }
            ),
            Artist.updateOne(
                { _id: artist._id },
                { $set: { isDeleted: true, deletedAt: now, deletedBy: actorAdminId, deleteReason: "Deleted by admin", activeStatus: "inactive" } }
            ),
        ]);
    }

    await User.updateOne(
        { _id: user._id },
        { $set: { isDeleted: true, deletedAt: now, deletedBy: actorAdminId, deleteReason: "Deleted by admin", activeStatus: "inactive" } }
    );

    void recordAuditEvent({
        actorUserId: actorAdminId,
        action: "admin.user.soft_delete",
        targetType: "user",
        targetId: user._id,
        metadata: { role: user.role, cascadedArtist: Boolean(artist) },
    }).catch(() => null);

    return { deletedId: user._id };
};

export default {
    getUsers,
    getUserDetail,
    getUserModerationAudit,
    updateUser,
    restoreUser,
    softDeleteUserForAdmin,
};
