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

const getPaymentDetail = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.user?._id;
        const paymentId = req.params.paymentId;

        const result = await userPaymentHistoryService.getPaymentDetail(
            userId,
            paymentId
        );

        return formatResponse.success(
            res,
            result,
            "Get payment detail successfully."
        );
    } catch (error) {
        next(error);
    }
};

const getPaymentReceiptPdf = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.user?._id;
        const paymentId = req.params.paymentId;

        const pdfBuffer = await userPaymentHistoryService.getPaymentReceiptPdf(
            userId,
            paymentId
        );

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `inline; filename="receipt-${paymentId}.pdf"`
        );

        return res.send(pdfBuffer);
    } catch (error) {
        next(error);
    }
};

export { getMyPaymentHistory, getPaymentDetail, getPaymentReceiptPdf };

export default {
    getMyPaymentHistory,
    getPaymentDetail,
    getPaymentReceiptPdf,
};
