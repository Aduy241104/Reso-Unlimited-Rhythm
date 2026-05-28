import Joi from "joi";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const trackIdParamSchema = Joi.object({
    id: Joi.string().trim().pattern(objectIdPattern).required(),
});

const dailyTopTracksQuerySchema = Joi.object({
    date: Joi.string()
        .trim()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .required()
        .messages({
            "string.pattern.base": "Date must be in YYYY-MM-DD format.",
        }),
    limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(10),
});

export default {
    trackIdParamSchema,
    dailyTopTracksQuerySchema,
};
