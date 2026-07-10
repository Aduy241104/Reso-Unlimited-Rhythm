import Joi from "joi";
import {
    AUTH_CLIENT_TYPES,
    AUTH_CLIENT_TYPE_VALUES,
    DEFAULT_AUTH_CLIENT_TYPE,
} from "../../constants/authClientTypes.js";

const genderSchema = Joi.string()
    .trim()
    .valid("male", "female", "other", "prefer_not_to_say");

const requestRegisterOtpSchema = Joi.object({
    email: Joi.string().trim().email().required(),
});

const registerSchema = Joi.object({
    email: Joi.string().trim().email().required(),
    otp: Joi.string().trim().length(6).pattern(/^\d+$/).required(),
    password: Joi.string().min(6).max(128).required(),
    fullName: Joi.string().trim().max(100).allow("").optional(),
    gender: genderSchema.optional(),
    dateOfBirth: Joi.date().iso().max("now").optional(),
    country: Joi.string().trim().max(100).allow("").optional(),
});

const clientTypeSchema = Joi.string()
    .trim()
    .valid(...AUTH_CLIENT_TYPE_VALUES)
    .default(DEFAULT_AUTH_CLIENT_TYPE);

const loginSchema = Joi.object({
    email: Joi.string().trim().email().required(),
    password: Joi.string().min(6).max(128).required(),
    clientType: clientTypeSchema,
});

const googleLoginSchema = Joi.object({
    token: Joi.string().trim().required(),
    clientType: clientTypeSchema,
});

const forgotPasswordSchema = Joi.object({
    email: Joi.string().trim().email().required(),
});

const resetPasswordSchema = Joi.object({
    token: Joi.string().trim().required(),
    password: Joi.string().min(6).max(128).required(),
    confirmPassword: Joi.string()
        .valid(Joi.ref("password"))
        .required()
        .messages({
            "any.only": "Confirm password does not match.",
        }),
});

const logoutSchema = Joi.object({
    clientType: clientTypeSchema,
    refreshToken: Joi.string().trim().optional(),
}).custom((value, helpers) => {
    if (value.clientType === AUTH_CLIENT_TYPES.MOBILE && !value.refreshToken) {
        return helpers.message("Refresh token is required for mobile client.");
    }

    return value;
});

const refreshTokenSchema = Joi.object({
    clientType: clientTypeSchema,
    refreshToken: Joi.string().trim().optional(),
}).custom((value, helpers) => {
    if (value.clientType === AUTH_CLIENT_TYPES.MOBILE && !value.refreshToken) {
        return helpers.message("Refresh token is required for mobile client.");
    }

    return value;
});

export default {
    requestRegisterOtpSchema,
    registerSchema,
    loginSchema,
    googleLoginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    logoutSchema,
    refreshTokenSchema,
};
