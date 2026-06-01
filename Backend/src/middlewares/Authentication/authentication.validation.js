import Joi from "joi";

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

const loginSchema = Joi.object({
    email: Joi.string().trim().email().required(),
    password: Joi.string().min(6).max(128).required(),
});

const googleLoginSchema = Joi.object({
    token: Joi.string().trim().required(),
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

const refreshTokenCookieSchema = Joi.object({
    refreshToken: Joi.string().trim().required(),
});

export default {
    requestRegisterOtpSchema,
    registerSchema,
    loginSchema,
    googleLoginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    refreshTokenCookieSchema,
};
