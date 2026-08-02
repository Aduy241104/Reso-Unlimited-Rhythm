import Transaction from "../../models/Transaction.js";

const PAYMENT_HISTORY_PAGE_SIZE = 10;

const PAYMENT_HISTORY_POPULATE = [
    {
        path: "planId",
        select: "name price durationDays status",
    },
    {
        path: "subscriptionId",
        select: "status startDate endDate autoRenew",
    },
];

const findPaymentHistoryByUserId = async (filter, options = {}) => {
    const skip = Number(options.skip) || 0;
    const limit = Number(options.limit) || PAYMENT_HISTORY_PAGE_SIZE;

    return await Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(PAYMENT_HISTORY_POPULATE)
        .lean();
};

const countPaymentHistoryByUserId = async (filter) => {
    return await Transaction.countDocuments(filter);
};

const findPaymentDetailByUserId = async (userId, paymentId) => {
    return await Transaction.findOne({
        _id: paymentId,
        userId,
    })
        .populate("planId", "name title price amount")
        .populate("subscriptionId", "status startDate endDate autoRenew")
        .lean();
};

export {
    PAYMENT_HISTORY_PAGE_SIZE,
    findPaymentHistoryByUserId,
    countPaymentHistoryByUserId,
    findPaymentDetailByUserId,
};

export default {
    PAYMENT_HISTORY_PAGE_SIZE,
    findPaymentHistoryByUserId,
    countPaymentHistoryByUserId,
    findPaymentDetailByUserId,
};
