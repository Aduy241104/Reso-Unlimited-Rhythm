import { OAuth2Client } from "google-auth-library";
import RefreshToken from "../../models/RefreshToken.js";
import User from "../../models/User.js";
import { AppError } from "../../utils/AppError.js";
import {
    createAccessToken,
    createRefreshToken,
    getRefreshExpireDate,
} from "../../utils/tokenUtils.js";

const GOOGLE_ISSUERS = new Set([
    "accounts.google.com",
    "https://accounts.google.com",
]);
const googleAuthClient = new OAuth2Client();

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

export const normalizeOptionalDate = (value) => {
    if (!value) {
        return undefined;
    }

    const parsedDate = value instanceof Date ? value : new Date(value);

    return Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate;
};

export const buildRegistrationProfilePayload = ({
    fullName,
    gender,
    dateOfBirth,
    country,
}) => ({
    fullName: fullName?.trim() || "",
    gender: gender || "prefer_not_to_say",
    dateOfBirth: normalizeOptionalDate(dateOfBirth),
    country: country?.trim() || "",
});

const buildGoogleProfilePayload = ({ fullName }) => ({
    fullName: fullName?.trim() || "",
});

export const ensureRegistrationAvailability = async (email) => {
    const [existingEmail] = await Promise.all([
        User.findOne({ email }),
    ]);

    if (existingEmail) {
        throw new AppError("Email is already in use.", 409, {
            field: "email",
        });
    }
};

export const createAuthSession = async (user) => {
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

export const verifyGoogleIdToken = async (token) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
        throw new AppError("Google login is not configured.", 500);
    }

    try {
        const ticket = await googleAuthClient.verifyIdToken({
            idToken: token,
            audience: clientId,
        });
        const payload = ticket.getPayload();

        if (!payload?.sub || !payload.email) {
            throw new AppError("Google token is invalid.", 401);
        }

        if (!GOOGLE_ISSUERS.has(payload.iss)) {
            throw new AppError("Google token issuer is invalid.", 401);
        }

        if (!payload.exp || payload.exp * 1000 <= Date.now()) {
            throw new AppError("Google token has expired.", 401);
        }

        if (payload.email_verified !== true) {
            throw new AppError("Google account email is not verified.", 403);
        }

        return {
            googleId: payload.sub,
            email: payload.email.trim().toLowerCase(),
            fullName: payload.name?.trim() || "",
            avatar: payload.picture || "",
        };
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
7
        throw new AppError("Google token is invalid.", 401);
    }
};

const hydrateExistingGoogleUser = async (user, googleProfile) => {
    if (user.authProvider !== "google") {
        return user;
    }

    let shouldSave = false;

    if (user.googleId !== googleProfile.googleId) {
        user.googleId = googleProfile.googleId;
        shouldSave = true;
    }

    if (googleProfile.avatar && user.avatar !== googleProfile.avatar) {
        user.avatar = googleProfile.avatar;
        shouldSave = true;
    }

    if (googleProfile.fullName && user.profile?.fullName !== googleProfile.fullName) {
        user.profile.fullName = googleProfile.fullName;
        shouldSave = true;
    }

    if (!user.emailVerified) {
        user.emailVerified = true;
        shouldSave = true;
    }

    if (shouldSave) {
        await user.save();
    }

    return user;
};

export const findOrCreateGoogleUser = async (googleProfile) => {
    const existingUser = await User.findOne({ email: googleProfile.email });

    if (existingUser) {
        ensureActiveUser(existingUser);
        return hydrateExistingGoogleUser(existingUser, googleProfile);
    }

    return User.create({
        email: googleProfile.email,
        authProvider: "google",
        googleId: googleProfile.googleId,
        avatar: googleProfile.avatar,
        role: "user",
        emailVerified: true,
        activeStatus: "active",
        profile: buildGoogleProfilePayload({
            fullName: googleProfile.fullName,
        }),
    });
};
