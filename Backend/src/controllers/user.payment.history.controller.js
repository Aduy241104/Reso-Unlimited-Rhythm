import userPaymentHistoryService from "../services/userPaymentHistory/user.payment.history.service.js";
import formatResponse from "../utils/formatResponse.js";
import { AppError } from "../utils/AppError.js";

const getMyPaymentHistory = async (req, res, next) => {
    try {
        const userId = req.user?._id || req.user?.id || req.user?.userId;

        if (!userId) {
            throw new AppError("Unauthorized.", 401);
        }

        const result = await userPaymentHistoryService.getMyPaymentHistory(
            userId,
            req.query
        );

        return formatResponse.success(
            res,
            result,
            "Get payment history successfully."
        );
    } catch (error) {
        next(error);
    }
};

export { getMyPaymentHistory };

export default {
    getMyPaymentHistory,
};
