import Joi from "joi";

const userIdParamSchema = Joi.object({
    id: Joi.string().hex().length(24).required(),
});

const updateUserSchema = Joi.object({
    role: Joi.string().valid("user", "artist", "admin").optional(),
    activeStatus: Joi.string().valid("active", "inactive", "blocked").optional(),
    fullName: Joi.string().trim().max(200).allow("").optional(),
    blockReason: Joi.string().trim().max(2000).allow("").optional(),
})
    .min(1)
    .messages({
        "object.min": "At least one supported user field is required.",
    });

export default {
    userIdParamSchema,
    updateUserSchema,
};
