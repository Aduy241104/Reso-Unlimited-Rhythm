import authenticationService from "../services/Authentication/authentication.service.js";
import formatResponse from "../utils/formatResponse.js";
import {
    REFRESH_TOKEN_COOKIE_MAX_AGE_MS,
} from "../utils/tokenUtils.js";

const isProduction = process.env.NODE_ENV === "production";

const buildCookieOptions = (maxAge) => ({
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge,
});

const setAuthenticationCookies = (res, tokens) => {
    res.cookie(
        "refreshToken",
        tokens.refreshToken,
        buildCookieOptions(REFRESH_TOKEN_COOKIE_MAX_AGE_MS)
    );
};

const clearCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
};


const register = async (req, res, next) => {
    try {
        const authResult = await authenticationService.register(req.body);

        return formatResponse.success(
            res,
            { user: authResult.user },
            "Register successful"
        );
    } catch (error) {
        next(error);
    }
};

const requestRegisterOtp = async (req, res, next) => {
    try {
        const otpResult = await authenticationService.requestRegisterOtp(
            req.body
        );

        return formatResponse.success(
            res,
            otpResult,
            "OTP sent successfully"
        );
    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const authResult = await authenticationService.login(req.body);

        setAuthenticationCookies(res, authResult);

        return formatResponse.success(
            res,
            { user: authResult.user, accessToken: authResult.accessToken },
            "Login successful"
        );
    } catch (error) {
        next(error);
    }
};

const googleLogin = async (req, res, next) => {
    try {
        const authResult = await authenticationService.googleLogin(req.body);

        setAuthenticationCookies(res, authResult);

        return formatResponse.success(
            res,
            { user: authResult.user, accessToken: authResult.accessToken },
            "Login successful"
        );
    } catch (error) {
        next(error);
    }
};

const forgotPassword = async (req, res, next) => {
    try {
        const resetResult = await authenticationService.requestForgotPassword(
            req.body
        );

        return formatResponse.success(
            res,
            resetResult,
            "If the email exists, a reset password link has been sent."
        );
    } catch (error) {
        next(error);
    }
};

const resetPassword = async (req, res, next) => {
    try {
        await authenticationService.resetPassword(req.body);

        return formatResponse.success(
            res,
            null,
            "Password reset successful"
        );
    } catch (error) {
        next(error);
    }
};

const logout = async (req, res, next) => {
    try {
        await authenticationService.logout(req.cookies.refreshToken);

        res.clearCookie("accessToken", clearCookieOptions);
        res.clearCookie("refreshToken", clearCookieOptions);

        return formatResponse.success(res, null, "Logout successful");
    } catch (error) {
        next(error);
    }
};

const refreshToken = async (req, res, next) => {
    try {
        const authResult = await authenticationService.refreshToken(
            req.cookies.refreshToken
        );

        setAuthenticationCookies(res, authResult);

        return formatResponse.success(
            res,
            {
                user: authResult.user,
                accessToken: authResult.accessToken,
            },
            "Token refreshed successfully"
        );
    } catch (error) {
        next(error);
    }
};

const me = async (req, res, next) => {
    try {
        return formatResponse.success(
            res,
            { user: req.user },
            "Current user fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    requestRegisterOtp,
    register,
    login,
    googleLogin,
    forgotPassword,
    resetPassword,
    logout,
    refreshToken,
    me
};
