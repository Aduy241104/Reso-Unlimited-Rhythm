import crypto from "crypto";
import User from "../../models/User.js";
import VerificationToken from "../../models/VerificationToken.js";
import { AppError } from "../../utils/AppError.js";
import { generateOtp } from "../../utils/generateOtp.js";
import { sendMobilePasswordResetOtpEmail } from "../../utils/mobilePasswordResetMailer.js";

const getPositiveEnvNumber = (key, fallback) => {
    const value = Number(process.env[key]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
};

const requestMobileForgotPassword = async ({ email }) => {
    const normalizedEmail = email.trim().toLowerCase();
    const resetTtlMinutes = getPositiveEnvNumber(
        "RESET_PASSWORD_TTL_MINUTES",
        15
    );
    const resendCooldownSeconds = getPositiveEnvNumber(
        "OTP_RESEND_COOLDOWN_SECONDS",
        60
    );
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || user.activeStatus !== "active") {
        return {
            expiresInMinutes: resetTtlMinutes,
            resendAfterSeconds: resendCooldownSeconds,
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
        lastRequestAt.getTime() + resendCooldownSeconds * 1000 > Date.now()
    ) {
        throw new AppError(
            "Please wait before requesting another password reset OTP.",
            429,
            { resendAfterSeconds: resendCooldownSeconds }
        );
    }

    const otp = generateOtp();
    const verificationData = {
        userId: user._id,
        email: normalizedEmail,
        token: crypto.randomBytes(32).toString("hex"),
        otp,
        type: "reset_password",
        expiresAt: new Date(Date.now() + resetTtlMinutes * 60 * 1000),
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

    await sendMobilePasswordResetOtpEmail({
        to: normalizedEmail,
        otp,
        ttlMinutes: resetTtlMinutes,
    });

    return {
        expiresInMinutes: resetTtlMinutes,
        resendAfterSeconds: resendCooldownSeconds,
    };
};

export default {
    requestMobileForgotPassword,
};
