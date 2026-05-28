import { StatusCodes } from "http-status-codes";
import { AppError } from "../../utils/AppError.js";
import { uploadImageBuffer, deleteImageByPublicId } from "../cloudinaryService.js";
import { extractPublicIdFromUrl } from "../../utils/uploadCloud.js";

const ALLOWED_GENDERS = new Set([
    "male",
    "female",
    "prefer_not_to_say",
]);
const CLOUDINARY_USER_FOLDER = "reso/users";

const normalizeProfile = (profile = {}) => ({
    fullName: profile.fullName ?? "",
    gender: profile.gender ?? "prefer_not_to_say",
    country: profile.country ?? "",
});

const normalizeId = (user = {}) => {
    if (user.id) {
        return user.id.toString();
    }

    if (user._id) {
        return user._id.toString();
    }

    return "";
};

export const formatCurrentUserProfile = (user = {}) => ({
    id: normalizeId(user),
    email: user.email ?? "",
    username: user.username ?? "",
    avatar: user.avatar ?? "",
    role: user.role ?? "",
    activeStatus: user.activeStatus ?? "",
    profile: normalizeProfile(user.profile),
});

const assertObjectPayload = (payload = {}) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new AppError("Invalid profile update payload.", StatusCodes.BAD_REQUEST);
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
            "gender must be one of: male, female, prefer_not_to_say.",
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
    uploadUserAvatar,
    deleteUserAvatarByUrl,
};
