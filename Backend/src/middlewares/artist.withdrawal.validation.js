import Joi from "joi";

const createPayoutAccountSchema = Joi.object({
    bankName: Joi.string().trim().max(120).required().messages({
        "any.required": "Vui lòng chọn ngân hàng.",
        "string.empty": "Vui lòng chọn ngân hàng.",
    }),
    accountNumber: Joi.string().trim().max(50).required().messages({
        "any.required": "Vui lòng nhập số tài khoản.",
        "string.empty": "Vui lòng nhập số tài khoản.",
    }),
    accountHolderName: Joi.string().trim().max(120).required().messages({
        "any.required": "Vui lòng nhập tên chủ tài khoản.",
        "string.empty": "Vui lòng nhập tên chủ tài khoản.",
    }),
    withdrawalPassword: Joi.string().min(6).max(100).allow("").optional().messages({
        "string.min": "Mật khẩu rút tiền phải có ít nhất 6 ký tự.",
    }),
});

const createWithdrawalRequestSchema = Joi.object({
    amount: Joi.number().integer().min(200000).required().messages({
        "any.required": "Vui lòng nhập số tiền muốn rút.",
        "number.base": "Số tiền rút không hợp lệ.",
        "number.integer": "Số tiền rút phải là số nguyên.",
        "number.min": "Số tiền rút tối thiểu là 200.000đ.",
    }),
    payoutAccountId: Joi.string().trim().required().messages({
        "any.required": "Vui lòng chọn tài khoản nhận tiền.",
        "string.empty": "Vui lòng chọn tài khoản nhận tiền.",
    }),
    withdrawalPassword: Joi.string().min(6).max(100).required().messages({
        "any.required": "Vui lòng nhập mật khẩu rút tiền.",
        "string.empty": "Vui lòng nhập mật khẩu rút tiền.",
        "string.min": "Mật khẩu rút tiền phải có ít nhất 6 ký tự.",
    }),
});

export default {
    createPayoutAccountSchema,
    createWithdrawalRequestSchema,
};
