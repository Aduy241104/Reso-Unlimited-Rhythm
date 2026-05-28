import bcrypt from "bcrypt";
import User from "../../models/User.js";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../utils/AppError.js";
import userServiceHelper from "./user.service.helper.js";

const SALT_ROUNDS = 10;

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

export default {
    getMyProfileByUserId,
    updateMyProfileByUserId,
    changeMyPasswordByUserId,
};
