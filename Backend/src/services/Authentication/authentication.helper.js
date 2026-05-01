import { AppError } from "../../utils/AppError.js";

export const sanitizeUser = (user) => ({
    id: user._id,
    email: user.email,
    username: user.username,
    avatar: user.avatar,
    role: user.role,
    activeStatus: user.activeStatus,
    profile: user.profile,
    settings: user.settings,
    subscription: user.subscription,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});

export const ensureActiveUser = (user) => {
    if (!user) {
        throw new AppError("User does not exist.", 404);
    }

    if (user.activeStatus === "blocked") {
        throw new AppError("Your account has been blocked.", 403);
    }

    if (user.activeStatus === "inactive") {
        throw new AppError("Your account is inactive.", 403);
    }
};
