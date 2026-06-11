import Joi from "joi";

const listTransactionsQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    q: Joi.string().allow("").trim(), // Tìm kiếm theo invoiceNumber hoặc gatewayTransactionId
    status: Joi.string().valid("pending", "success", "failed", "refunded").allow(""),
    paymentMethod: Joi.string().valid("momo", "vnpay", "stripe", "card").allow(""),
    paymentGateway: Joi.string().valid("momo", "vnpay", "stripe").allow(""),
});

export default {
    listTransactionsQuerySchema,
};