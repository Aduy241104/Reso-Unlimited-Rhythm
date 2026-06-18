import Joi from "joi";

const listRevenuePeriodsQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    year: Joi.number().integer().min(2000).optional(),
    month: Joi.number().integer().min(1).max(12).optional(),
    status: Joi.string()
        .valid("open", "closed", "calculated", "confirmed")
        .optional(),
});

const revenuePeriodIdParamSchema = Joi.object({
    id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
});

const runRevenueAggregationBodySchema = Joi.object({
    targetMonth: Joi.string()
        .pattern(/^\d{4}-(0[1-9]|1[0-2])$/)
        .optional(),
});

export default {
    listRevenuePeriodsQuerySchema,
    revenuePeriodIdParamSchema,
    runRevenueAggregationBodySchema,
};
