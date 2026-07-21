import bcrypt from "bcrypt";
import crypto from "crypto";
import RefreshToken from "../../models/RefreshToken.js";
import User from "../../models/User.js";
import VerificationToken from "../../models/VerificationToken.js";
import { AppError } from "../../utils/AppError.js";
import { buildResetLink } from "../../utils/buildForgotPasswordLink.js";
import { generateOtp } from "../../utils/generateOtp.js";
import {
    sendOtpEmail,
    sendResetPasswordLinkEmail,
} from "../../utils/mailer.js";
import {
    buildRefreshTokenClientTypeQuery,
    normalizeAuthClientType,
} from "../../constants/authClientTypes.js";
import {
    buildRegistrationProfilePayload,
    createAuthSession,
    ensureEmailCanStartRegistration,
    ensureActiveUser,
    findOrCreateGoogleUser,
    isInactiveUnverifiedUser,
    sanitizeUser,
    verifyGoogleIdToken,
} from "./authentication.helper.js";
import {
    createAccessToken,
    createRefreshToken,
    getRefreshExpireDate,
} from "../../utils/tokenUtils.js";

const SALT_ROUNDS = 10;
const OTP_TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES || 5);
const OTP_RESEND_COOLDOWN_SECONDS = Number(
    process.env.OTP_RESEND_COOLDOWN_SECONDS || 60
);
const RESET_PASSWORD_TTL_MINUTES = Number(
    process.env.RESET_PASSWORD_TTL_MINUTES || 15
);

const getOtpExpireDate = () =>
    new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

const getResetPasswordExpireDate = () =>
    new Date(Date.now() + RESET_PASSWORD_TTL_MINUTES * 60 * 1000);

const createPendingRegistrationPasswordHash = async () =>
    bcrypt.hash(crypto.randomBytes(32).toString("hex"), SALT_ROUNDS);

const requestRegistrationOtp = async ({ email }) => {
    const normalizedEmail = email.trim().toLowerCase();

    let pendingUser = await ensureEmailCanStartRegistration(normalizedEmail);

    if (!pendingUser) {
        pendingUser = await User.create({
            email: normalizedEmail,
            password: await createPendingRegistrationPasswordHash(),
            activeStatus: "inactive",
            emailVerified: false,
        });
    }

    const latestVerification = await VerificationToken.findOne({
        email: normalizedEmail,
        type: "verify_email",
        isUsed: false,
    }).sort({ createdAt: -1 });

    const lastOtpIssuedAt = latestVerification
        ? latestVerification.updatedAt || latestVerification.createdAt
        : null;

    if (
        lastOtpIssuedAt &&
        lastOtpIssuedAt.getTime() + OTP_RESEND_COOLDOWN_SECONDS * 1000 >
        Date.now()
    ) {
        throw new AppError(
            "Please wait before requesting another OTP.",
            429,
            { resendAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS }
        );
    }

    const otp = generateOtp();

    const verificationData = {
        userId: pendingUser._id,
        email: normalizedEmail,
        otp,
        token: crypto.randomBytes(32).toString("hex"),
        type: "verify_email",
        expiresAt: getOtpExpireDate(),
        isUsed: false,
    };

    let activeVerificationToken;
    if (latestVerification) {
        latestVerification.userId = verificationData.userId;
        latestVerification.otp = verificationData.otp;
        latestVerification.token = verificationData.token;
        latestVerification.expiresAt = verificationData.expiresAt;
        latestVerification.isUsed = false;
        activeVerificationToken = await latestVerification.save();
    } else {
        activeVerificationToken = await VerificationToken.create(
            verificationData
        );
    }

    await VerificationToken.deleteMany({
        email: normalizedEmail,
        type: "verify_email",
        _id: { $ne: activeVerificationToken._id },
    });

    await sendOtpEmail({
        to: normalizedEmail,
        code: otp,
        type: "register",
        ttlMinutes: OTP_TTL_MINUTES,
    });

    return {
        email: normalizedEmail,
        expiresInMinutes: OTP_TTL_MINUTES,
        resendAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS,
    };
};

const completeRegistration = async ({
    email,
    otp,
    password,
    fullName,
    gender,
    dateOfBirth,
    country,
}) => {
    const normalizedEmail = email.trim().toLowerCase();
    const registrationProfile = buildRegistrationProfilePayload({
        fullName,
        gender,
        dateOfBirth,
        country,
    });

    const verificationToken = await VerificationToken.findOne({
        email: normalizedEmail,
        otp,
        type: "verify_email",
        isUsed: false,
    }).sort({ createdAt: -1 });

    if (!verificationToken) {
        throw new AppError("OTP is invalid.", 400, {
            field: "otp",
        });
    }

    if (verificationToken.expiresAt.getTime() <= Date.now()) {
        verificationToken.isUsed = true;
        await verificationToken.save();

        throw new AppError("OTP has expired.", 400, {
            field: "otp",
        });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user =
        (verificationToken.userId &&
            (await User.findById(verificationToken.userId))) ||
        (await User.findOne({ email: normalizedEmail }));

    if (user && !isInactiveUnverifiedUser(user)) {
        if (user.activeStatus === "blocked") {
            throw new AppError("Your account has been blocked.", 403);
        }

        throw new AppError("Email is already in use.", 409, {
            field: "email",
        });
    }

    const registrationUser = user || (await User.create({
        email: normalizedEmail,
        password: await createPendingRegistrationPasswordHash(),
        activeStatus: "inactive",
        emailVerified: false,
    }));

    registrationUser.password = hashedPassword;
    registrationUser.profile = registrationProfile;
    registrationUser.emailVerified = true;
    registrationUser.activeStatus = "active";
    registrationUser.blockReason = "";
    await registrationUser.save();

    verificationToken.userId = registrationUser._id;
    verificationToken.isUsed = true;
    await verificationToken.save();

    await VerificationToken.deleteMany({
        email: normalizedEmail,
        type: "verify_email",
        _id: { $ne: verificationToken._id },
    });

    return {
        user: sanitizeUser(registrationUser),
    };
};

const buildStoredRefreshTokenQuery = ({ token, clientType }) => ({
    token,
    isRevoked: false,
    ...buildRefreshTokenClientTypeQuery(clientType),
});

const login = async ({ email, password, clientType }) => {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
        throw new AppError("Email or password is incorrect.", 401);
    }

    await ensureActiveUser(user);

    const isPasswordMatched = await bcrypt.compare(password, user.password);
    if (!isPasswordMatched) {
        throw new AppError("Email or password is incorrect.", 401);
    }

    return createAuthSession(user, clientType);
};

const googleLogin = async ({ token, clientType }) => {
    const googleProfile = await verifyGoogleIdToken(token);
    const user = await findOrCreateGoogleUser(googleProfile);

    return createAuthSession(user, clientType);
};

const requestForgotPassword = async ({ email }) => {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || user.activeStatus !== "active") {
        return {
            expiresInMinutes: RESET_PASSWORD_TTL_MINUTES,
            resendAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS,
        };
    }

    const latestVerification = await VerificationToken.findOne({
        email: normalizedEmail,
        type: "reset_password",
        isUsed: false,
    }).sort({ createdAt: -1 });

    const lastRequestAt = latestVerification
        ? latestVerification.updatedAt || latestVerification.createdAt
        : null;

    if (
        lastRequestAt &&
        lastRequestAt.getTime() + OTP_RESEND_COOLDOWN_SECONDS * 1000 >
        Date.now()
    ) {
        throw new AppError(
            "Please wait before requesting another reset link.",
            429,
            { resendAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS }
        );
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const otp = generateOtp();
    const verificationData = {
        userId: user._id,
        email: normalizedEmail,
        token: resetToken,
        otp,
        type: "reset_password",
        expiresAt: getResetPasswordExpireDate(),
        isUsed: false,
    };

    let activeVerificationToken;
    if (latestVerification) {
        latestVerification.userId = verificationData.userId;
        latestVerification.token = verificationData.token;
        latestVerification.otp = verificationData.otp;
        latestVerification.expiresAt = verificationData.expiresAt;
        latestVerification.isUsed = false;
        activeVerificationToken = await latestVerification.save();
    } else {
        activeVerificationToken = await VerificationToken.create(
            verificationData
        );
    }

    await VerificationToken.deleteMany({
        email: normalizedEmail,
        type: "reset_password",
        _id: { $ne: activeVerificationToken._id },
    });

    await sendResetPasswordLinkEmail({
        to: normalizedEmail,
        resetLink: buildResetLink({ token: resetToken }),
        otp,
        ttlMinutes: RESET_PASSWORD_TTL_MINUTES,
    });

    return {
        expiresInMinutes: RESET_PASSWORD_TTL_MINUTES,
        resendAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS,
    };
};

const resetPassword = async ({ token, email, otp, password }) => {
    const credentialQuery = token
        ? { token: token.trim() }
        : {
            email: email.trim().toLowerCase(),
            otp: otp.trim(),
        };

    const verificationToken = await VerificationToken.findOne({
        ...credentialQuery,
        type: "reset_password",
        isUsed: false,
    }).sort({ createdAt: -1 });

    if (!verificationToken) {
        throw new AppError("Reset password verification is invalid.", 400, {
            field: token ? "token" : "otp",
        });
    }

    if (verificationToken.expiresAt.getTime() <= Date.now()) {
        verificationToken.isUsed = true;
        await verificationToken.save();

        throw new AppError("Reset password verification has expired.", 400, {
            field: token ? "token" : "otp",
        });
    }

    const user =
        (verificationToken.userId &&
            (await User.findById(verificationToken.userId))) ||
        (await User.findOne({ email: verificationToken.email }));

    await ensureActiveUser(user);

    const isSamePassword = await bcrypt.compare(password, user.password);
    if (isSamePassword) {
        throw new AppError(
            "New password must be different from the current password.",
            400,
            { field: "password" }
        );
    }

    user.password = await bcrypt.hash(password, SALT_ROUNDS);
    await user.save();

    verificationToken.isUsed = true;
    verificationToken.userId = user._id;
    await verificationToken.save();

    await Promise.all([
        VerificationToken.deleteMany({
            email: user.email,
            type: "reset_password",
            _id: { $ne: verificationToken._id },
        }),
        RefreshToken.updateMany(
            { userId: user._id, isRevoked: false },
            { $set: { isRevoked: true } }
        ),
    ]);
};

const logout = async ({ token, clientType }) => {
    if (!token) {
        return;
    }

    const storedToken = await RefreshToken.findOne({
        ...buildStoredRefreshTokenQuery({
            token,
            clientType,
        }),
    });

    if (!storedToken) {
        return;
    }

    storedToken.isRevoked = true;
    await storedToken.save();
};

const refreshToken = async ({ token, clientType }) => {
    if (!token) {
        throw new AppError("Refresh token is required.", 401);
    }

    const normalizedClientType = normalizeAuthClientType(clientType);
    const storedToken = await RefreshToken.findOne({
        ...buildStoredRefreshTokenQuery({
            token,
            clientType: normalizedClientType,
        }),
    }).populate("userId");

    if (!storedToken) {
        throw new AppError("Refresh token is invalid.", 401);
    }

    if (storedToken.expiresAt.getTime() <= Date.now()) {
        storedToken.isRevoked = true;
        await storedToken.save();

        throw new AppError("Refresh token has expired.", 401);
    }

    const user = storedToken.userId;
    await ensureActiveUser(user);

    storedToken.clientType = normalizedClientType;
    storedToken.token = createRefreshToken();
    storedToken.expiresAt = getRefreshExpireDate();
    await storedToken.save();

    return {
        accessToken: createAccessToken(user),
        refreshToken: storedToken.token,
        user: sanitizeUser(user),
    };
};

export default {
    requestRegistrationOtp,
    completeRegistration,
    login,
    googleLogin,
    requestForgotPassword,
    resetPassword,
    logout,
    refreshToken
};
