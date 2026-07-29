import Joi from "joi";

const listArtistRevenuePeriodsQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    status: Joi.string().valid("pending", "calculated", "confirmed").optional(),
    year: Joi.number().integer().min(2000).optional(),
    month: Joi.number().integer().min(1).max(12).optional(),
});

const artistRevenuePeriodDetailParamSchema = Joi.object({
    id: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required(),
});

export default {
    listArtistRevenuePeriodsQuerySchema,
    artistRevenuePeriodDetailParamSchema,
};
