import Joi from "joi";

const objectIdSchema = Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
        "string.pattern.base": "id must be a valid ObjectId string",
    });

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

const withdrawalRequestIdParamSchema = Joi.object({
    id: objectIdSchema,
});

const rejectWithdrawalRequestBodySchema = Joi.object({
    rejectReason: Joi.string().trim().min(1).max(1000).required(),
});

export default {
    listWithdrawalRequestsQuerySchema,
    withdrawalRequestIdParamSchema,
    rejectWithdrawalRequestBodySchema,
};
