import Joi from "joi";

const listWithdrawalRequestsQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    status: Joi.string().valid("pending", "approved", "rejected", "paid").optional(),
    method: Joi.string().valid("bank", "momo").optional(),
    sortBy: Joi.string()
        .valid("requestedAt", "amount", "status", "method", "createdAt", "updatedAt")
        .optional(),
    sortOrder: Joi.string().valid("asc", "desc").optional(),
    q: Joi.string().trim().max(200).allow("").optional(),
});

export default {
    listWithdrawalRequestsQuerySchema,
};
