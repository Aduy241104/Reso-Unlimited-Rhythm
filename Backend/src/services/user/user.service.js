import bcrypt from "bcrypt";
import User from "../../models/User.js";
import Artist from "../../models/Artist.js";
import Album from "../../models/Album.js";
import Track from "../../models/Track.js";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../utils/AppError.js";
import userServiceHelper from "./user.service.helper.js";
import { recordAuditEvent } from "../audit/auditLog.service.js";

const SALT_ROUNDS = 10;

const getMyProfileByUserId = async (userId) => {
    const user = await User.findById(userId)
        .select("-password -__v")
        .lean();

    if (!user) {
        throw new AppError("User does not exist.", 404);
    }

    return await userServiceHelper.formatCurrentUserProfile(user);
};

const updateMyProfileByUserId = async (userId, payload, avatarFile) => {
    const user = await User.findById(userId).select("-password -__v");

    if (!user) {
        throw new AppError("User does not exist.", 404);
    }

    const updates = userServiceHelper.buildMyProfileUpdates(payload);
    const previousAvatar = user.avatar || "";

    if (avatarFile) {
        updates.avatar = await userServiceHelper.uploadUserAvatar(
            userId,
            avatarFile
        );
    }

    if (Object.keys(updates).length === 0) {
        throw new AppError(
            "At least one field must be provided to update your profile.",
            StatusCodes.BAD_REQUEST
        );
    }

    if (typeof updates.avatar !== "undefined") {
        user.avatar = updates.avatar;
    }

    if (typeof updates["profile.fullName"] !== "undefined") {
        user.profile.fullName = updates["profile.fullName"];
    }

    if (typeof updates["profile.gender"] !== "undefined") {
        user.profile.gender = updates["profile.gender"];
    }

    if (typeof updates["profile.dateOfBirth"] !== "undefined") {
        user.profile.dateOfBirth = updates["profile.dateOfBirth"];
    }

    await user.save();

    if (avatarFile && previousAvatar && previousAvatar !== user.avatar) {
        await userServiceHelper.deleteUserAvatarByUrl(previousAvatar);
    }

    return await userServiceHelper.formatCurrentUserProfile(user.toObject());
};

const changeMyPasswordByUserId = async (userId, payload) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new AppError("User does not exist.", 404);
    }

    const { currentPassword, newPassword } =
        userServiceHelper.buildChangePasswordPayload(payload);

    const isCurrentPasswordMatched = await bcrypt.compare(
        currentPassword,
        user.password
    );
    if (!isCurrentPasswordMatched) {
        throw new AppError(
            "Current password is incorrect.",
            StatusCodes.BAD_REQUEST,
            {
                field: "currentPassword",
            }
        );
    }

    user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await user.save();
};

const softDeleteMyAccountByUserId = async (userId) => {
    const user = await User.findById(userId);

    if (!user || user.isDeleted === true) {
        throw new AppError("User does not exist.", 404);
    }

    if (user.role === "admin") {
        const activeAdminCount = await User.countDocuments({
            role: "admin",
            activeStatus: "active",
            isDeleted: { $ne: true },
        });
        if (activeAdminCount <= 1) {
            throw new AppError("The last active admin cannot delete their account.", 409);
        }
    }

    const artist = await Artist.findOne({ userId, isDeleted: { $ne: true } });
    if (artist) {
        await Promise.all([
            Track.updateMany(
                { artist_artistId: artist._id, isDeleted: { $ne: true } },
                {
                    $set: {
                        isDeleted: true,
                        deletedAt: new Date(),
                        deletedBy: user._id,
                        deleteReason: "Account deleted by artist",
                        activeStatus: "hidden",
                    },
                }
            ),
            Album.updateMany(
                { artistId: artist._id, isDeleted: { $ne: true } },
                {
                    $set: {
                        isDeleted: true,
                        deletedAt: new Date(),
                        deletedBy: user._id,
                        deleteReason: "Account deleted by artist",
                        status: "hidden",
                    },
                }
            ),
            Artist.updateOne(
                { _id: artist._id },
                {
                    $set: {
                        isDeleted: true,
                        deletedAt: new Date(),
                        deletedBy: user._id,
                        deleteReason: "Account deleted by artist",
                        activeStatus: "inactive",
                    },
                }
            ),
        ]);
    }

    user.isDeleted = true;
    user.deletedAt = new Date();
    user.deletedBy = user._id;
    user.deleteReason = "Account deleted by user";
    user.activeStatus = "inactive";
    await user.save();

    void recordAuditEvent({
        actorUserId: user._id,
        action: "user.account.soft_delete",
        targetType: "user",
        targetId: user._id,
        metadata: { role: user.role, cascadedArtist: Boolean(artist) },
    }).catch(() => null);
};

export default {
    getMyProfileByUserId,
    updateMyProfileByUserId,
    changeMyPasswordByUserId,
    softDeleteMyAccountByUserId,
};
