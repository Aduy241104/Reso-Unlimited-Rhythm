import Joi from "joi";

const requestRegisterOtpSchema = Joi.object({
    email: Joi.string().trim().email().required(),
    password: Joi.string().min(6).max(128).required(),
    fullName: Joi.string().trim().max(100).allow("").optional(),
});

const registerSchema = Joi.object({
    email: Joi.string().trim().email().required(),
    otp: Joi.string().trim().length(6).pattern(/^\d+$/).required(),
});

const loginSchema = Joi.object({
    email: Joi.string().trim().email().required(),
    password: Joi.string().min(6).max(128).required(),
});

const refreshTokenCookieSchema = Joi.object({
    refreshToken: Joi.string().trim().required(),
});

export default {
    requestRegisterOtpSchema,
    registerSchema,
    loginSchema,
    refreshTokenCookieSchema,
};
