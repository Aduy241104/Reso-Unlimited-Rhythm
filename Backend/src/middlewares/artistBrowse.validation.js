import Joi from "joi";

const dailyTopArtistsQuerySchema = Joi.object({
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
        .max(20)
        .default(10),
});

const monthlyTopArtistsQuerySchema = Joi.object({
    month: Joi.string()
        .trim()
        .pattern(/^\d{4}-\d{2}$/)
        .required()
        .messages({
            "string.pattern.base": "Month must be in YYYY-MM format.",
        }),
    limit: Joi.number()
        .integer()
        .min(1)
        .max(20)
        .default(10),
});

export default {
    dailyTopArtistsQuerySchema,
    monthlyTopArtistsQuerySchema,
};
