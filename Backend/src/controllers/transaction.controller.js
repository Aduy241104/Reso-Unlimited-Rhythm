import transactionService from "../services/transaction/transaction.service.js";
import formatResponse from "../utils/formatResponse.js";

const getTransactionsByUserId = async (req, res, next) => {
    try {
        const { userId } = req.params;

        const transactions = await transactionService.getByUserId(userId);

        return formatResponse.success(
            res,
            { transactions },
            "Transactions fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getTransactionsByUserId,
};