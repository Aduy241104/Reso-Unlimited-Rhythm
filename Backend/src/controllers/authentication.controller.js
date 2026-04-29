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

export default {
    login,
};
