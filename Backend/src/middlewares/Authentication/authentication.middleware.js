import jwt from "jsonwebtoken";
import User from "../../models/User.js";
import { AppError } from "../../utils/AppError.js";
import {
    ensureActiveUser,
    sanitizeUser,
} from "../../services/Authentication/authentication.helper.js";
import { StatusCodes } from "http-status-codes";
import { resolveUserPremiumState } from "../../utils/premiumAccess.js";

const extractAccessToken = (req) => {
    const authorizationHeader = req.headers.authorization || "";

    if (authorizationHeader.startsWith("Bearer ")) {
        return authorizationHeader.slice(7).trim();
    }

    return req.cookies?.accessToken || null;
};

const normalizeAllowedRoles = (allowedRoles) => {
    if (!allowedRoles) {
        return [];
    }

    if (Array.isArray(allowedRoles)) {
        return allowedRoles;
    }

    return [allowedRoles];
};

    const authenticate = (allowedRoles = []) => {
        const normalizedAllowedRoles = normalizeAllowedRoles(allowedRoles);

        return async (req, res, next) => {
            try {
                const accessToken = extractAccessToken(req);

                if (!accessToken) {
                    throw new AppError("Access token is required.", StatusCodes.UNAUTHORIZED);
                }

                let decodedToken;
                try {
                    decodedToken = jwt.verify(accessToken, process.env.JWT_SECRET);
                } catch (error) {
                    if (error.name === "TokenExpiredError") {
                        throw new AppError("Access token has expired.", StatusCodes.UNAUTHORIZED);
                    }

                    throw new AppError("Access token is invalid.", StatusCodes.UNAUTHORIZED);
                }

                const user = await User.findById(decodedToken.id);
                await ensureActiveUser(user);

                if (
                    normalizedAllowedRoles.length > 0 &&
                    !normalizedAllowedRoles.includes(user.role)
                ) {
                    throw new AppError("You do not have permission to access this resource.", StatusCodes.FORBIDDEN, {
                        allowedRoles: normalizedAllowedRoles,
                    });
                }

                req.user = sanitizeUser(user);
                req.auth = {
                    accessToken,
                    tokenPayload: decodedToken,
                };

                next();
            } catch (error) {
                next(error);
            }
        };
    };

const optionalAuthenticate = () => {
    return async (req, res, next) => {
        try {
            const accessToken = extractAccessToken(req);

            if (!accessToken) {
                return next();
            }

            let decodedToken;
            try {
                decodedToken = jwt.verify(accessToken, process.env.JWT_SECRET);
            } catch (error) {
                if (error.name === "TokenExpiredError") {
                    throw new AppError("Access token has expired.", StatusCodes.UNAUTHORIZED);
                }

                throw new AppError("Access token is invalid.", StatusCodes.UNAUTHORIZED);
            }

            const user = await User.findById(decodedToken.id);
            await ensureActiveUser(user);

            req.user = sanitizeUser(user);
            req.auth = {
                accessToken,
                tokenPayload: decodedToken,
            };

            next();
        } catch (error) {
            next(error);
        }
    };
};

export const requirePremiumAccess = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new AppError("Unauthorized.", StatusCodes.UNAUTHORIZED);
        }

        const isPremium = await resolveUserPremiumState(req.user);

        if (!isPremium) {
            throw new AppError(
                "Premium subscription is required to access this resource.",
                StatusCodes.FORBIDDEN,
                {
                    requiredPlan: "premium",
                    redirectPath: "/premium",
                }
            );
        }

        next();
    } catch (error) {
        next(error);
    }
};

export const authorizeRoles = (...roles) => authenticate(roles);
export const requireAdmin = authenticate("admin");
export const requireArtist = authenticate("artist");
export const requireUser = authenticate(["user", "artist"]);
export { optionalAuthenticate };

export default authenticate;
