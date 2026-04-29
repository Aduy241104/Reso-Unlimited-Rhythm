import bcrypt from "bcrypt";
import crypto from "crypto";
import RefreshToken from "../../models/RefreshToken.js";
import User from "../../models/User.js";
import VerificationToken from "../../models/VerificationToken.js";
import { AppError } from "../../utils/AppError.js";
import { generateOtp } from "../../utils/generateOtp.js";
import { sendOtpEmail } from "../../utils/mailer.js";
import {
    createAccessToken,
    createRefreshToken,
    getRefreshExpireDate,
} from "../../utils/tokenUtils.js";


const sanitizeUser = (user) => ({
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

const ensureActiveUser = (user) => {
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


const login = async ({ email, password }) => {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
        throw new AppError("Email or password is incorrect.", 401);
    }

    ensureActiveUser(user);

    const isPasswordMatched = await bcrypt.compare(password, user.password);
    if (!isPasswordMatched) {
        throw new AppError("Email or password is incorrect.", 401);
    }

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken();

    await RefreshToken.create({
        userId: user._id,
        token: refreshToken,
        expiresAt: getRefreshExpireDate(),
        isRevoked: false,
    });

    return {
        accessToken,
        refreshToken,
        user: sanitizeUser(user),
    };
};


export default {
    login,
};
