import User from "../../models/User.js";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../utils/AppError.js";
import userServiceHelper from "./user.service.helper.js";

const getMyProfileByUserId = async (userId) => {
    const user = await User.findById(userId)
        .select("-password -__v")
        .lean();

    if (!user) {
        throw new AppError("User does not exist.", 404);
    }

    return userServiceHelper.formatCurrentUserProfile(user);
};

const updateMyProfileByUserId = async (userId, payload, avatarFile) => {
    const user = await User.findById(userId).select("-password -__v");

    if (!user) {
        throw new AppError("User does not exist.", 404);
    }

    const updates = userServiceHelper.buildMyProfileUpdates(payload);
    const previousAvatar = user.avatar || "";

    if (avatarFile) {
        updates.avatar = await userServiceHelper.uploadUserAvatar(userId, avatarFile);
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

    if (typeof updates["profile.country"] !== "undefined") {
        user.profile.country = updates["profile.country"];
    }

    await user.save();

    if (avatarFile && previousAvatar && previousAvatar !== user.avatar) {
        await userServiceHelper.deleteUserAvatarByUrl(previousAvatar);
    }

    return userServiceHelper.formatCurrentUserProfile(user.toObject());
};

export default {
    getMyProfileByUserId,
    updateMyProfileByUserId,
};
