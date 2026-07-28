import { StatusCodes } from "http-status-codes";
import { AppError } from "../../utils/AppError.js";
import { uploadImageBuffer, deleteImageByPublicId } from "../cloudinaryService.js";
import { extractPublicIdFromUrl } from "../../utils/uploadCloud.js";
import { resolveUserPremiumState } from "../../utils/premiumAccess.js";

const ALLOWED_GENDERS = new Set([
    "male",
    "female",
    "other",
]);
const CLOUDINARY_USER_FOLDER = "reso/users";

const normalizeId = (user = {}) => {
    if (user.id) {
        return user.id.toString();
    }

    if (user._id) {
        return user._id.toString();
    }

    return "";
};

export const formatCurrentUserProfile = async (user = {}) => ({
    id: normalizeId(user),
    email: user.email ?? "",
    username: user.username ?? "",
    avatar: user.avatar ?? "",
    role: user.role ?? "",
    activeStatus: user.activeStatus ?? "",
    isPremium: await resolveUserPremiumState(user),
});

const assertObjectPayload = (
    payload = {},
    message = "Invalid profile update payload."
) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new AppError(message, StatusCodes.BAD_REQUEST);
    }
};

const getPayloadValue = (payload, fieldName) => {
    if (Object.prototype.hasOwnProperty.call(payload, fieldName)) {
        return payload[fieldName];
    }

    if (Object.prototype.hasOwnProperty.call(payload, `profile.${fieldName}`)) {
        return payload[`profile.${fieldName}`];
    }

    if (
        payload.profile &&
        typeof payload.profile === "object" &&
        !Array.isArray(payload.profile) &&
        Object.prototype.hasOwnProperty.call(payload.profile, fieldName)
    ) {
        return payload.profile[fieldName];
    }

    return undefined;
};

const sanitizeString = (value, fieldName) => {
    if (typeof value !== "string") {
        throw new AppError(`${fieldName} must be a string.`, StatusCodes.BAD_REQUEST);
    }

    return value.trim();
};

const sanitizePassword = (value, fieldName) => {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new AppError(`${fieldName} is required.`, StatusCodes.BAD_REQUEST, {
            field: fieldName,
        });
    }

    return value;
};

const validateNewPasswordStrength = (password) => {
    if (password.length < 8) {
        throw new AppError(
            "New password must be at least 8 characters long.",
            StatusCodes.BAD_REQUEST,
            { field: "newPassword" }
        );
    }

    if (!/[A-Z]/.test(password)) {
        throw new AppError(
            "New password must contain at least 1 uppercase letter.",
            StatusCodes.BAD_REQUEST,
            { field: "newPassword" }
        );
    }

    if (!/\d/.test(password)) {
        throw new AppError(
            "New password must contain at least 1 digit.",
            StatusCodes.BAD_REQUEST,
            { field: "newPassword" }
        );
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        throw new AppError(
            "New password must contain at least 1 special character.",
            StatusCodes.BAD_REQUEST,
            { field: "newPassword" }
        );
    }
};

const sanitizeFullName = (value) => {
    const trimmed = sanitizeString(value, "fullName");

    if (trimmed.length < 2) {
        throw new AppError(
            "fullName must be at least 2 characters long.",
            StatusCodes.BAD_REQUEST
        );
    }

    return trimmed;
};

const sanitizeGender = (value) => {
    if (typeof value !== "string" || !ALLOWED_GENDERS.has(value)) {
        throw new AppError(
            "gender must be one of: male, female, other.",
            StatusCodes.BAD_REQUEST
        );
    }

    return value;
};

export const buildMyProfileUpdates = (payload = {}) => {
    assertObjectPayload(payload);

    const updates = {};
    const fullName = getPayloadValue(payload, "fullName");
    const gender = getPayloadValue(payload, "gender");
    const country = getPayloadValue(payload, "country");

    if (typeof fullName !== "undefined") {
        updates["profile.fullName"] = sanitizeFullName(fullName);
    }

    if (typeof gender !== "undefined") {
        updates["profile.gender"] = sanitizeGender(gender);
    }

    if (typeof country !== "undefined") {
        updates["profile.country"] = sanitizeString(country, "country");
    }

    return updates;
};

export const buildChangePasswordPayload = (payload = {}) => {
    assertObjectPayload(payload, "Invalid change password payload.");

    const currentPassword = sanitizePassword(
        payload.currentPassword,
        "currentPassword"
    );
    const newPassword = sanitizePassword(payload.newPassword, "newPassword");
    const confirmPassword = sanitizePassword(
        payload.confirmPassword,
        "confirmPassword"
    );

    if (newPassword !== confirmPassword) {
        throw new AppError(
            "Confirm password does not match.",
            StatusCodes.BAD_REQUEST,
            { field: "confirmPassword" }
        );
    }

    if (newPassword === currentPassword) {
        throw new AppError(
            "New password must be different from the current password.",
            StatusCodes.BAD_REQUEST,
            { field: "newPassword" }
        );
    }

    validateNewPasswordStrength(newPassword);

    return {
        currentPassword,
        newPassword,
        confirmPassword,
    };
};

export const uploadUserAvatar = async (userId, avatarFile) => {
    if (!avatarFile) {
        return "";
    }

    try {
        const uploaded = await uploadImageBuffer({
            buffer: avatarFile.buffer,
            folder: CLOUDINARY_USER_FOLDER,
            publicId: `user_${userId}_avatar_${Date.now()}`,
        });

        return uploaded.secure_url;
    } catch {
        throw new AppError(
            "Could not upload avatar image. Check storage configuration and try again.",
            StatusCodes.BAD_GATEWAY
        );
    }
};

export const deleteUserAvatarByUrl = async (avatarUrl) => {
    const publicId = extractPublicIdFromUrl(avatarUrl);

    if (!publicId) {
        return null;
    }

    try {
        return await deleteImageByPublicId(publicId, true);
    } catch (error) {
        console.error("[ERROR] Delete user avatar failed:", error);
        return null;
    }
};

export default {
    formatCurrentUserProfile,
    buildMyProfileUpdates,
    buildChangePasswordPayload,
    uploadUserAvatar,
    deleteUserAvatarByUrl,
};
