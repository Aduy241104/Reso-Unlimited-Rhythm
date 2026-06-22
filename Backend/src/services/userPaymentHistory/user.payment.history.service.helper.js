import Transaction from "../../models/Transaction.js";

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
    const limit = Number(options.limit) || 10;

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

export {
    findPaymentHistoryByUserId,
    countPaymentHistoryByUserId,
};

export default {
    findPaymentHistoryByUserId,
    countPaymentHistoryByUserId,
};
