import adminTransactionService from "../services/transaction/admin.transaction.service.js";
import adminTransactionValidation from "../middlewares/Admin/admin.transaction.validation.js";
import formatResponse from "../utils/formatResponse.js";
import { AppError } from "../utils/AppError.js";

const listTransactionsForAdmin = async (req, res, next) => {
    try {
        // Thực hiện validate query parameters gửi lên từ client
        const { error, value } = adminTransactionValidation.listTransactionsQuerySchema.validate(
            req.query,
            { abortEarly: false, stripUnknown: true }
        );

        if (error) {
            throw new AppError(
                "Invalid request data.",
                400,
                error.details.map((detail) => ({
                    field: detail.path.join("."),
                    message: detail.message,
                }))
            );
        }

        // Gọi service xử lý
        const result = await adminTransactionService.listTransactionsForAdmin(value);

        // Trả data về theo đúng format chuẩn của hệ thống bạn
        return formatResponse.success(
            res,
            { transactions: result.transactions },
            "Transactions fetched successfully",
            result.pagination
        );
    } catch (error) {
        next(error);
    }
};

export default {
    listTransactionsForAdmin,
};