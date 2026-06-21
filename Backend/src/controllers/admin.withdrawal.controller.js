import adminWithdrawalService from "../services/revenue/admin.withdrawal.service.js";
import formatResponse from "../utils/formatResponse.js";

const getWithdrawalRequests = async (req, res, next) => {
    try {
        const result = await adminWithdrawalService.getWithdrawalRequestsForAdmin(req.query);

        return formatResponse.success(
            res,
            { withdrawals: result.withdrawals },
            "Withdrawal requests fetched successfully",
            result.pagination
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getWithdrawalRequests,
};
