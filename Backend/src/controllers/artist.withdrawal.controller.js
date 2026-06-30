import artistWithdrawalService from "../services/artist/artist.withdrawal.service.js";
import formatResponse from "../utils/formatResponse.js";

const getMyRevenueSummary = async (req, res, next) => {
    try {
        const revenue = await artistWithdrawalService.getMyRevenueSummaryByUserId(
            req.user.id
        );

        return formatResponse.success(
            res,
            { revenue },
            "Lấy dữ liệu số dư nghệ sĩ thành công"
        );
    } catch (error) {
        next(error);
    }
};

const getMyWithdrawalRequests = async (req, res, next) => {
    try {
        const result = await artistWithdrawalService.getMyWithdrawalRequestsByUserId(
            req.user.id,
            req.query
        );

        return formatResponse.success(
            res,
            { withdrawalRequests: result.withdrawalRequests },
            "Lấy danh sách yêu cầu rút tiền thành công",
            result.pagination
        );
    } catch (error) {
        next(error);
    }
};

const createMyPayoutAccount = async (req, res, next) => {
    try {
        const result = await artistWithdrawalService.createPayoutAccountByUserId(
            req.user.id,
            req.body
        );

        return formatResponse.success(
            res,
            result,
            "Lưu tài khoản nhận tiền thành công"
        );
    } catch (error) {
        next(error);
    }
};

const createMyWithdrawalRequest = async (req, res, next) => {
    try {
        const result = await artistWithdrawalService.createWithdrawalRequestByUserId(
            req.user.id,
            req.body
        );

        return formatResponse.success(
            res,
            result,
            "Tạo yêu cầu rút tiền thành công"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getMyRevenueSummary,
    getMyWithdrawalRequests,
    createMyPayoutAccount,
    createMyWithdrawalRequest,
};
