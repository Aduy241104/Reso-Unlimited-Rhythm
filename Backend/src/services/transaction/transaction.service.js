import Transaction from "../../models/Transaction.js";

const getByUserId = async (userId) => {
    return await Transaction.find({ userId })
        .populate("planId", "name price duration")
        .sort({ createdAt: -1 });
};

export default {
    getByUserId,
};