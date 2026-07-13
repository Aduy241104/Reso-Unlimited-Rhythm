import adminTransactionService from "../services/transaction/admin.transaction.service.js";
import formatResponse from "../utils/formatResponse.js";

const getTransactionList = async (req, res, next) => {
    try {
        const result = await adminTransactionService.getTransactionList(req.query);

        return formatResponse.success(
            res,
            {
                transactions: result.transactions,
                pagination: result.pagination,
            },
            "Transactions retrieved successfully."
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getTransactionList,
};
