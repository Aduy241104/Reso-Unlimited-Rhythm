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

const approveWithdrawalRequest = async (req, res, next) => {
    try {
        const withdrawalRequest = await adminWithdrawalService.approveWithdrawalRequest(
            req.params.id,
            req.user?.id || req.user?._id
        );

        return formatResponse.success(
            res,
            { withdrawalRequest },
            "Withdrawal request approved successfully"
        );
    } catch (error) {
        next(error);
    }
};

const getWithdrawalRequestDetail = async (req, res, next) => {
    try {
        const withdrawalRequest = await adminWithdrawalService.getWithdrawalRequestDetailForAdmin(
            req.params.id
        );

        return formatResponse.success(
            res,
            { withdrawalRequest },
            "Withdrawal request detail fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getWithdrawalRequests,
    approveWithdrawalRequest,
    getWithdrawalRequestDetail,
};
