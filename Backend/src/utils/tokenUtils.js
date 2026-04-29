import jwt from "jsonwebtoken";
import crypto from "crypto";

export const ACCESS_EXPIRES_IN = "1h";
export const ACCESS_TOKEN_COOKIE_MAX_AGE_MS = 60 * 60 * 1000;
export const REFRESH_EXPIRES_DAYS = 7;
export const REFRESH_TOKEN_COOKIE_MAX_AGE_MS =
    REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000;

export const createAccessToken = (user) => {
    return jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: ACCESS_EXPIRES_IN }
    );
};


export const createRefreshToken = () => {
    return crypto.randomBytes(64).toString("hex");
};

export const getRefreshExpireDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + REFRESH_EXPIRES_DAYS);
    return date;
};
